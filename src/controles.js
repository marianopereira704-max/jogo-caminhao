// Lê os botões da tela e a inclinação do celular, e entrega um "estado" simples
// que o caminhão usa: direcao (-1 a 1), acelerar, frear.
import { CONFIG } from './config.js';

const vibrar = (ms) => { try { navigator.vibrate && navigator.vibrate(ms); } catch {} };

// Liga um botão a "apertado/solto", aceitando vários dedos ao mesmo tempo.
function botaoSegurar(el, aoMudar) {
  const dedos = new Set();
  const atualizar = () => {
    const apertado = dedos.size > 0;
    el.classList.toggle('apertado', apertado);
    aoMudar(apertado);
  };
  el.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    try { el.setPointerCapture(e.pointerId); } catch {}
    if (dedos.size === 0) vibrar(12);
    dedos.add(e.pointerId);
    atualizar();
  });
  const soltar = (e) => {
    if (!dedos.has(e.pointerId)) return;
    dedos.delete(e.pointerId);
    atualizar();
  };
  el.addEventListener('pointerup', soltar);
  el.addEventListener('pointercancel', soltar);
  el.addEventListener('lostpointercapture', soltar);
}

// Botão de toque único (dispara ao encostar o dedo, sem esperar soltar).
function botaoToque(el, aoTocar) {
  el.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    vibrar(15);
    aoTocar(e);
  });
}

export class Controles {
  constructor({ audio, preferencias, aoTrocarMarcha, aoBuzinar, aoVoltarEstrada, aoMudarPreferencias, aoGaragem, aoCacamba }) {
    this.audio = audio;
    this.pref = preferencias;
    this.aoMudarPreferencias = aoMudarPreferencias;

    // estado lido pelo caminhão a cada quadro
    this.estado = { direcao: 0, acelerar: false, frear: false };

    this._esq = false;
    this._dir = false;
    this._gas = false;
    this._inclinacao = 0;           // -1 a 1, já suavizada

    // ----- Setas -----
    botaoSegurar(document.getElementById('btn-esq'), (v) => { this._esq = v; });
    botaoSegurar(document.getElementById('btn-dir'), (v) => { this._dir = v; });

    // ----- Pedais -----
    botaoSegurar(document.getElementById('btn-acelerador'), (v) => { this._gas = v; });
    botaoSegurar(document.getElementById('btn-freio'), (v) => { this.estado.frear = v; });

    // ----- Buzina -----
    botaoSegurar(document.getElementById('btn-buzina'), (v) => aoBuzinar(v));

    // ----- Câmbio: tocar em D ou em R -----
    for (const el of document.querySelectorAll('.marcha')) {
      botaoToque(el, () => aoTrocarMarcha(el.dataset.marcha));
    }

    // ----- Voltar para a estrada -----
    botaoToque(document.getElementById('btn-estrada'), () => { audio.clique(true); aoVoltarEstrada(); });

    // ----- Garagem e caçamba -----
    botaoToque(document.getElementById('btn-garagem'), () => aoGaragem());
    botaoToque(document.getElementById('btn-cacamba'), () => aoCacamba());

    // ----- Configurações -----
    const painel = document.getElementById('painel-config');
    botaoToque(document.getElementById('btn-config'), () => { audio.clique(); painel.classList.remove('escondido'); });
    botaoToque(document.getElementById('btn-fechar-config'), () => { audio.clique(); painel.classList.add('escondido'); });
    for (const el of painel.querySelectorAll('[data-modo]')) {
      botaoToque(el, () => { audio.clique(true); this.definirModo(el.dataset.modo, true); });
    }
    for (const el of painel.querySelectorAll('[data-auto]')) {
      botaoToque(el, () => { audio.clique(true); this.definirAuto(el.dataset.auto === 'sim', true); });
    }

    // ----- Sensor de inclinação -----
    window.addEventListener('devicemotion', (e) => this._lerInclinacao(e));

    // bloqueia o menu de segurar o dedo e o zoom de pinça
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('gesturestart', (e) => e.preventDefault());

    this.definirModo(this.pref.modoDirecao, false);
    this.definirAuto(this.pref.aceleradorAuto, false);
  }

  // Pede permissão do sensor (necessário no iPhone; no Android passa direto)
  async pedirPermissaoSensor() {
    const DM = window.DeviceMotionEvent;
    if (DM && typeof DM.requestPermission === 'function') {
      try { await DM.requestPermission(); } catch {}
    }
  }

  definirModo(modo, salvar) {
    this.pref.modoDirecao = modo;
    const inclinar = modo === 'inclinacao';
    document.getElementById('btn-esq').classList.toggle('escondido', inclinar);
    document.getElementById('btn-dir').classList.toggle('escondido', inclinar);
    document.getElementById('indicador-inclinacao').classList.toggle('escondido', !inclinar);
    for (const el of document.querySelectorAll('[data-modo]')) {
      el.classList.toggle('selecionada', el.dataset.modo === modo);
    }
    if (inclinar) this.pedirPermissaoSensor();
    if (salvar) this.aoMudarPreferencias(this.pref);
  }

  definirAuto(ligado, salvar) {
    this.pref.aceleradorAuto = ligado;
    document.getElementById('btn-acelerador').classList.toggle('automatico', ligado);
    for (const el of document.querySelectorAll('[data-auto]')) {
      el.classList.toggle('selecionada', (el.dataset.auto === 'sim') === ligado);
    }
    if (salvar) this.aoMudarPreferencias(this.pref);
  }

  _lerInclinacao(e) {
    const g = e.accelerationIncludingGravity;
    if (!g || g.y == null) return;
    // Em paisagem, o eixo "y" do celular fica na horizontal.
    // Girar o celular como um volante muda quanto da gravidade cai nesse eixo.
    const angulo = (screen.orientation && screen.orientation.angle) ?? window.orientation ?? 90;
    const lado = (angulo === 270 || angulo === -90) ? -1 : 1;
    const seno = Math.max(-1, Math.min(1, (g.y * lado) / 9.81));
    let graus = Math.asin(seno) * 180 / Math.PI;

    const zm = CONFIG.inclinacaoZonaMorta;
    if (Math.abs(graus) < zm) graus = 0;
    else graus = Math.sign(graus) * (Math.abs(graus) - zm);
    const alvo = Math.max(-1, Math.min(1, graus / (CONFIG.inclinacaoMax - zm)));

    // filtro para tirar a tremedeira da mão
    this._inclinacao += (alvo - this._inclinacao) * 0.3;
  }

  // Chamar a cada quadro, antes do caminhão se mover.
  atualizar() {
    if (this.pref.modoDirecao === 'inclinacao') {
      this.estado.direcao = this._inclinacao;
      document.getElementById('volante').style.transform = `rotate(${this._inclinacao * 90}deg)`;
    } else {
      this.estado.direcao = (this._dir ? 1 : 0) - (this._esq ? 1 : 0);
    }
    // acelerador automático: anda sozinho, só para quando ele freia
    this.estado.acelerar = this.pref.aceleradorAuto ? !this.estado.frear : this._gas;
  }

  // Atualiza o desenho da alavanca do câmbio.
  mostrarMarcha(marcha, trocando) {
    const cambio = document.getElementById('cambio');
    cambio.classList.toggle('re', marcha === 'R');
    cambio.classList.toggle('trocando', !!trocando);
    for (const el of document.querySelectorAll('.marcha')) {
      el.classList.toggle('selecionada', el.dataset.marcha === marcha);
    }
  }
}

// Ponto de partida do jogo: liga a engine, monta o mundo e roda o laço principal.
import { CONFIG } from './config.js';
import { carregar, salvar } from './salvar.js';
import { Audio } from './audio.js';
import { Controles } from './controles.js';
import { Caminhao } from './caminhao.js';
import { CameraSeguir } from './camera.js';
import { MundoLitoral } from './mundo/litoral.js';
import { Garagem } from './garagem.js';

const B = window.BABYLON;
if (!B) throw new Error('Babylon.js não carregou. Confira a internet e recarregue.');

const canvas = document.getElementById('tela-jogo');
const engine = new B.Engine(canvas, true, { preserveDrawingBuffer: false, stencil: false, antialias: true }, true);
// Resolução: começa na nativa da tela. Se o celular não aguentar 30 fps,
// baixa um pouco sozinho (veja "qualidade automática" no laço principal).
let resolucao = Math.min(window.devicePixelRatio || 1, CONFIG.resolucaoMax);
const ajustarResolucao = () => {
  const dpr = window.devicePixelRatio || 1;
  // nível de escala = 1 / multiplicador (0,5 = o dobro de pixels por ponto da tela)
  engine.setHardwareScalingLevel(1 / Math.min(dpr, resolucao));
};
ajustarResolucao();

const scene = new B.Scene(engine);
scene.skipPointerMovePicking = true;
scene.autoClear = true;

const preferencias = carregar();
const audio = new Audio();
const mundo = new MundoLitoral(scene);
const caminhao = new Caminhao(scene, mundo.sombras);
caminhao.modelo.definirReflexo(mundo.env);
caminhao.aplicarVisual(preferencias);
const camera = new CameraSeguir(scene, canvas);

const voltarParaEstrada = () => {
  const i = mundo.inicio;
  caminhao.colocarEm(i.x, i.z, i.angulo);
  camera.pular(caminhao);
};
voltarParaEstrada();

caminhao.aoEncostar = (forte) => { audio.toc(forte); try { navigator.vibrate && navigator.vibrate(forte ? [60, 40, 30] : 30); } catch {} };

// ----- Telas: 'inicio' -> 'garagem' <-> 'dirigindo' -----
let estado = 'inicio';
const hud = document.getElementById('hud');

const irParaGaragem = () => {
  estado = 'garagem';
  hud.classList.add('escondido');
  audio.desligarMotor();
  audio.atualizarBipRe(false, 0);
  audio.buzina(false);
  audio.hidraulico(false);
  garagem.ativar();
};
const irDirigir = () => {
  garagem.desativar();
  caminhao.aplicarVisual(preferencias);
  estado = 'dirigindo';
  hud.classList.remove('escondido');
};

const garagem = new Garagem(engine, canvas, {
  preferencias,
  audio,
  aoMudar: (p) => salvar(p),
  aoDirigir: irDirigir,
});

const controles = new Controles({
  audio,
  preferencias,
  aoTrocarMarcha: (m) => { if (caminhao.pedirMarcha(m)) audio.clique(m === 'D'); },
  aoBuzinar: (ligada) => audio.buzina(ligada),
  aoVoltarEstrada: voltarParaEstrada,
  aoMudarPreferencias: (p) => salvar(p),
  aoGaragem: () => { audio.clique(); irParaGaragem(); },
  aoCacamba: () => {
    const subindo = caminhao.alternarCacamba();
    audio.clique(subindo);
    document.getElementById('btn-cacamba').classList.toggle('ligado', subindo);
  },
});

// ----- Tela cheia -----
// O navegador só aceita entrar em tela cheia logo depois de um toque do usuário
// (no Android, é o "soltar o dedo" que conta, não o "encostar").
const entrarTelaCheia = async () => {
  try {
    const raiz = document.documentElement;
    if (raiz.requestFullscreen && !document.fullscreenElement) await raiz.requestFullscreen({ navigationUI: 'hide' });
  } catch {}
  try { await screen.orientation.lock('landscape'); } catch {}
};
// se a tela cheia sair (ex.: arrastou a barra), o próximo toque volta para ela
document.addEventListener('pointerup', () => { if (estado !== 'inicio' && !document.fullscreenElement) entrarTelaCheia(); });

// ----- Tela inicial: o primeiro toque libera tela cheia, som e sensores -----
document.getElementById('btn-jogar').addEventListener('click', async (e) => {
  e.preventDefault();
  if (estado !== 'inicio') return;
  audio.iniciar();
  audio.clique(true);
  document.getElementById('tela-inicio').classList.add('escondido');
  if (preferencias.modoDirecao === 'inclinacao') controles.pedirPermissaoSensor();
  irParaGaragem();
  await entrarTelaCheia();
});

// ----- Laço principal: alvo de 60 quadros por segundo, com qualidade automática -----
const elVel = document.getElementById('vel');
let velMostrada = -1;
let ultimo = performance.now();
let fpsAlvo = CONFIG.fps;
let intervalo = 1000 / fpsAlvo;

// qualidade automática: se em 3 s ficar bem abaixo do alvo, primeiro baixa a resolução;
// se já estiver no mínimo e ainda não aguentar 60, passa a rodar estável a 30
let quadros = 0;
let inicioJanela = performance.now();
const conferirQualidade = (agora) => {
  quadros++;
  if (agora - inicioJanela < 3000) return;
  const fps = quadros / ((agora - inicioJanela) / 1000);
  if (estado !== 'inicio' && fps < fpsAlvo * 0.85) {
    if (resolucao > CONFIG.resolucaoMin) {
      resolucao = Math.max(CONFIG.resolucaoMin, resolucao - 0.25);
      ajustarResolucao();
    } else if (fpsAlvo > CONFIG.fpsMinimo) {
      fpsAlvo = CONFIG.fpsMinimo;
      intervalo = 1000 / fpsAlvo;
    }
  }
  quadros = 0;
  inicioJanela = agora;
};

engine.runRenderLoop(() => {
  const agora = performance.now();
  if (agora - ultimo < intervalo - 2) return;     // ainda não é hora do próximo quadro
  const dt = Math.min((agora - ultimo) / 1000, 0.1);
  ultimo = agora;

  if (estado === 'garagem') {
    garagem.atualizar(dt);
    conferirQualidade(agora);
    return;
  }
  if (estado === 'dirigindo') {
    controles.atualizar();
    caminhao.atualizar(dt, controles.estado, mundo);
    controles.mostrarMarcha(caminhao.marchaPendente || caminhao.marcha, !!caminhao.marchaPendente);
    audio.atualizarMotor(Math.abs(caminhao.velocidade) / CONFIG.velMaxFrente, controles.estado.acelerar);
    audio.atualizarBipRe(caminhao.marcha === 'R' && !caminhao.marchaPendente, dt);
    audio.hidraulico(caminhao.cacambaMexendo);
    const v = Math.round(caminhao.velocidadeKmh);
    if (v !== velMostrada) { elVel.textContent = v; velMostrada = v; }   // só mexe na tela quando muda
  }
  camera.atualizar(caminhao, dt);
  mundo.seguirSol(caminhao.posicao);
  mundo.atualizar(dt);
  scene.render();
  conferirQualidade(agora);
});

window.addEventListener('resize', () => { ajustarResolucao(); engine.resize(); });
// quando o jogo volta para a tela, zera a contagem (evita baixar qualidade à toa)
document.addEventListener('visibilitychange', () => { quadros = 0; inicioJanela = performance.now(); ultimo = performance.now(); });

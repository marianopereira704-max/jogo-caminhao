// Garagem lúdica: uma oficina com luminárias, engrenagens na parede e um elevador.
// O caminhão fica no elevador; ele escolhe cor, pintura, rodas e acessórios.
// É uma cena separada do mundo, com luz e câmera próprias.
import { CONFIG } from './config.js';
import { montarCacamba8x4 } from './modelos/cacamba-8x4.js';
import { TIPOS_RODA } from './modelos/rodas.js';
import { TIPOS_ACESSORIO } from './modelos/acessorios.js';
import { TIPOS_PADRAO } from './modelos/pintura.js';
import { criarReflexo } from './reflexo.js';
import { ICONES_RODA, ICONES_ACESSORIO, ICONES_PADRAO, ICONES_CATEGORIA } from './icones.js';

const B = window.BABYLON;
const CATEGORIAS = ['pintura', 'rodas', 'acessorios'];

function mat(scene, nome, cor, brilho = 0.1, emissivo = null) {
  const m = new B.StandardMaterial(nome, scene);
  m.diffuseColor = B.Color3.FromHexString(cor);
  m.specularColor = new B.Color3(brilho, brilho, brilho);
  if (emissivo) m.emissiveColor = B.Color3.FromHexString(emissivo);
  return m;
}

// textura da parede do fundo: painéis, quadro de ferramentas e prateleira
function texturaParede(scene) {
  const W = 2048, H = 1024;
  const t = new B.DynamicTexture('tex-parede', { width: W, height: H }, scene, true);
  const c = t.getContext();
  c.fillStyle = '#3c4862'; c.fillRect(0, 0, W, H);
  // painéis de chapa
  c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 4;
  for (let x = 0; x < W; x += 256) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); }
  c.fillStyle = 'rgba(255,255,255,.05)';
  for (let x = 0; x < W; x += 256) c.fillRect(x + 6, 0, 18, H);
  // faixa de rodapé
  c.fillStyle = '#2b3447'; c.fillRect(0, H - 150, W, 150);
  for (let x = -40; x < W; x += 80) { c.fillStyle = '#f5b82e'; c.beginPath(); c.moveTo(x, H - 150); c.lineTo(x + 40, H - 150); c.lineTo(x + 80, H - 110); c.lineTo(x + 40, H - 110); c.fill(); }
  // quadro de ferramentas furado
  const qx = 1250, qy = 190, qw = 640, qh = 420;
  c.fillStyle = '#c9a46e'; c.fillRect(qx, qy, qw, qh);
  c.fillStyle = 'rgba(70,45,20,.55)';
  for (let x = qx + 20; x < qx + qw; x += 32) for (let y = qy + 20; y < qy + qh; y += 32) { c.beginPath(); c.arc(x, y, 4, 0, 7); c.fill(); }
  c.fillStyle = '#2d3138';
  // chave inglesa
  c.save(); c.translate(qx + 140, qy + 210); c.rotate(-0.5);
  c.fillRect(-14, -120, 28, 220); c.beginPath(); c.arc(0, -130, 42, 0, 7); c.fill();
  c.fillStyle = '#c9a46e'; c.fillRect(-14, -180, 28, 60); c.restore();
  c.fillStyle = '#2d3138';
  // martelo
  c.save(); c.translate(qx + 330, qy + 220); c.fillRect(-12, -80, 24, 200); c.fillRect(-70, -120, 140, 50); c.restore();
  // chave de fenda
  c.save(); c.translate(qx + 500, qy + 210); c.rotate(0.4); c.fillStyle = '#d9141b'; c.fillRect(-20, -150, 40, 110); c.fillStyle = '#2d3138'; c.fillRect(-6, -40, 12, 180); c.restore();
  // prateleira com latas
  c.fillStyle = '#2b3447'; c.fillRect(160, 420, 700, 22);
  const latas = ['#d9141b', '#1f5fbf', '#f5c518', '#2f9e44', '#f07a1a'];
  latas.forEach((cor, i) => { c.fillStyle = cor; c.fillRect(200 + i * 120, 310, 80, 110); c.fillStyle = '#e9edf0'; c.fillRect(200 + i * 120, 300, 80, 20); });
  // pneus empilhados desenhados
  for (let i = 0; i < 3; i++) { c.fillStyle = '#1b1b1b'; c.fillRect(260, 640 + i * 70, 260, 60); c.fillStyle = '#2f2f2f'; c.fillRect(270, 650 + i * 70, 240, 10); }
  t.update();
  return t;
}

// textura do chão: concreto com a faixa zebrada em volta do elevador
function texturaChao(scene) {
  const W = 1024, H = 1024;
  const t = new B.DynamicTexture('tex-chao-gar', { width: W, height: H }, scene, true);
  const c = t.getContext();
  c.fillStyle = '#8c9096'; c.fillRect(0, 0, W, H);
  for (let i = 0; i < 4000; i++) { c.fillStyle = Math.random() < 0.5 ? 'rgba(0,0,0,.05)' : 'rgba(255,255,255,.05)'; c.fillRect(Math.random() * W, Math.random() * H, 3, 3); }
  c.strokeStyle = 'rgba(0,0,0,.18)'; c.lineWidth = 3;
  for (let x = 0; x < W; x += 128) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); c.beginPath(); c.moveTo(0, x); c.lineTo(W, x); c.stroke(); }
  // moldura zebrada (o elevador fica no centro)
  const m = 300, larg = 40;
  c.save(); c.beginPath(); c.rect(m - larg, m - larg, W - 2 * m + 2 * larg, W - 2 * m + 2 * larg); c.rect(m, m, W - 2 * m, W - 2 * m); c.clip('evenodd');
  c.fillStyle = '#1b1b1b'; c.fillRect(0, 0, W, H);
  c.fillStyle = '#f5b82e';
  for (let d = -W; d < 2 * W; d += 60) { c.beginPath(); c.moveTo(d, 0); c.lineTo(d + 30, 0); c.lineTo(d + 30 - H, H); c.lineTo(d - H, H); c.fill(); }
  c.restore();
  t.update();
  return t;
}

function texturaZebra(scene) {
  const t = new B.DynamicTexture('tex-zebra-gar', { width: 512, height: 32 }, scene, true);
  const c = t.getContext();
  c.fillStyle = '#1b1b1b'; c.fillRect(0, 0, 512, 32);
  c.fillStyle = '#f5b82e';
  for (let x = -32; x < 512; x += 48) { c.beginPath(); c.moveTo(x, 32); c.lineTo(x + 24, 0); c.lineTo(x + 48, 0); c.lineTo(x + 24, 32); c.fill(); }
  t.update();
  return t;
}

export class Garagem {
  constructor(engine, canvas, { preferencias, audio, aoMudar, aoDirigir }) {
    this.canvas = canvas;
    this.pref = preferencias;
    this.audio = audio;
    this.aoMudar = aoMudar;
    this.categoria = 0;
    this.tempo = 0;
    this.alvoCacamba = 0;
    this.altElevador = 0;

    const scene = this.scene = new B.Scene(engine);
    scene.skipPointerMovePicking = true;
    scene.clearColor = new B.Color4(0.12, 0.14, 0.2, 1);
    scene.ambientColor = new B.Color3(0.25, 0.25, 0.3);

    this._montarOficina(scene);

    // ---- caminhão no elevador ----
    this.giro = new B.TransformNode('prato', scene);
    this.giro.parent = this.prato;
    this.giro.position.y = 0.1;
    this.modelo = montarCacamba8x4(scene);
    this.modelo.raiz.parent = this.giro;
    this.modelo.usarSombras(this.sombras);
    this.modelo.definirReflexo(criarReflexo(scene, [this.parede, this.chao, this.paredeLado], new B.Vector3(0, 3, 0)));
    this._aplicarTudo();

    // ---- câmera fixa (quem gira é o elevador, com o dedo) ----
    this.cam = new B.UniversalCamera('cam', new B.Vector3(-9.6, 5.4, 11.6), scene);
    this.cam.setTarget(new B.Vector3(0.6, 1.9, 0));
    this.cam.fov = 0.95;
    this.cam.inputs.clear();
    this.ultimoToque = -10;
    this.arrasto = null;
    canvas.addEventListener('pointerdown', (e) => { if (this.ativa) { this.arrasto = { x: e.clientX, id: e.pointerId }; this.ultimoToque = this.tempo; } });
    canvas.addEventListener('pointermove', (e) => {
      if (!this.ativa || !this.arrasto || e.pointerId !== this.arrasto.id) return;
      this.giro.rotation.y -= (e.clientX - this.arrasto.x) * 0.01;
      this.arrasto.x = e.clientX;
      this.ultimoToque = this.tempo;
    });
    const soltar = () => { this.arrasto = null; };
    canvas.addEventListener('pointerup', soltar);
    canvas.addEventListener('pointercancel', soltar);

    this._montarInterface(aoDirigir);
  }

  _montarOficina(scene) {
    // luz geral fraca + 3 luminárias penduradas (spots quentes)
    const amb = new B.HemisphericLight('amb', new B.Vector3(0, 1, 0), scene);
    amb.intensity = 0.55;
    amb.diffuse = new B.Color3(0.85, 0.88, 1);
    amb.groundColor = new B.Color3(0.3, 0.3, 0.35);
    const sol = new B.DirectionalLight('chave', new B.Vector3(0.45, -1, -0.5), scene);
    sol.position = new B.Vector3(-10, 20, 10);
    sol.intensity = 0.5;
    this.sombras = new B.ShadowGenerator(2048, sol);
    this.sombras.usePercentageCloserFiltering = true;
    this.sombras.darkness = 0.35;
    this.sombras.bias = 0.002;

    // chão
    const chao = this.chao = B.MeshBuilder.CreateGround('chao', { width: 34, height: 34 }, scene);
    const mChao = mat(scene, 'mchao', '#ffffff', 0.05);
    mChao.diffuseTexture = texturaChao(scene);
    chao.material = mChao;
    chao.receiveShadows = true;

    // paredes (fundo e lateral direita, atrás do caminhão vistas da câmera)
    const mParede = mat(scene, 'mparede', '#ffffff', 0.05);
    mParede.diffuseTexture = texturaParede(scene);
    this.parede = B.MeshBuilder.CreatePlane('parede', { width: 34, height: 12 }, scene);
    this.parede.position.set(0, 6, -10);
    this.parede.rotation.y = Math.PI;
    this.parede.material = mParede;
    this.parede.receiveShadows = true;
    const mParede2 = mat(scene, 'mparede2', '#36415a', 0.05);
    this.paredeLado = B.MeshBuilder.CreatePlane('parede-lado', { width: 34, height: 12 }, scene);
    this.paredeLado.position.set(11, 6, 0);
    this.paredeLado.rotation.y = Math.PI / 2;
    this.paredeLado.material = mParede2;
    this.paredeLado.receiveShadows = true;

    // engrenagens decorativas na parede lateral
    const mEng = mat(scene, 'meng', '#59627a', 0.25);
    const mEngEsc = mat(scene, 'meng2', '#2b3244', 0.1);
    const engrenagem = (raio, y, z, giroVel) => {
      const base = new B.TransformNode('engrenagem', scene);
      base.position.set(10.85, y, z);
      base.rotation.z = Math.PI / 2;            // eixo apontando para dentro da parede
      const g = new B.TransformNode('giro-engrenagem', scene);
      g.parent = base;
      const disco = B.MeshBuilder.CreateCylinder('e', { diameter: raio * 2, height: 0.2, tessellation: 40 }, scene);
      disco.material = mEng; disco.parent = g;
      const furo = B.MeshBuilder.CreateCylinder('e', { diameter: raio * 0.5, height: 0.22, tessellation: 24 }, scene);
      furo.material = mEngEsc; furo.parent = g;
      const n = Math.round(raio * 10);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const d = B.MeshBuilder.CreateBox('e', { width: 0.32, height: 0.2, depth: raio * 0.3 }, scene);
        d.position.set(Math.cos(a) * raio, 0, Math.sin(a) * raio);
        d.rotation.y = -a;
        d.material = mEng; d.parent = g;
      }
      return { g, giroVel };
    };
    this.engrenagens = [engrenagem(2.2, 8.2, -4.5, 0.25), engrenagem(1.3, 5.7, -1.7, -0.42), engrenagem(1.6, 2.6, -6.6, 0.34)];

    // luminárias penduradas com fachos de luz visíveis
    const mCupula = mat(scene, 'mcupula', '#4b4f6b', 0.3);
    const mLampada = mat(scene, 'mlampada', '#fff2c4', 0.0, '#fff2c4');
    const mFacho = new B.StandardMaterial('mfacho', scene);
    mFacho.emissiveColor = new B.Color3(1, 0.9, 0.65);
    mFacho.disableLighting = true;
    mFacho.alpha = 0.08;
    mFacho.backFaceCulling = false;
    mFacho.alphaMode = B.Engine.ALPHA_ADD;
    this.lampadas = [];
    for (const [x, z] of [[-4.5, 1.2], [0.2, -0.4], [4.8, -2]]) {
      const altura = 8.6;
      const fio = B.MeshBuilder.CreateCylinder('fio', { diameter: 0.05, height: 4 }, scene);
      fio.position.set(x, altura + 2.2, z); fio.material = mCupula;
      const cup = B.MeshBuilder.CreateCylinder('cupula', { diameterTop: 0.35, diameterBottom: 1.7, height: 0.75, tessellation: 24 }, scene);
      cup.position.set(x, altura, z); cup.material = mCupula;
      const lamp = B.MeshBuilder.CreateSphere('lampada', { diameter: 0.45, segments: 8 }, scene);
      lamp.position.set(x, altura - 0.35, z); lamp.material = mLampada;
      const facho = B.MeshBuilder.CreateCylinder('facho', { diameterTop: 1.5, diameterBottom: 7.5, height: altura - 0.4, tessellation: 32, cap: B.Mesh.NO_CAP }, scene);
      facho.position.set(x, (altura - 0.4) / 2, z); facho.material = mFacho; facho.isPickable = false;
      const luz = new B.SpotLight('spot', new B.Vector3(x, altura - 0.4, z), new B.Vector3(0, -1, 0), 0.9, 2, scene);
      luz.diffuse = new B.Color3(1, 0.92, 0.75);
      luz.intensity = 1.1;
      luz.range = 14;
      this.lampadas.push(luz);
    }

    // elevador: base sanfonada + prato listrado (gira com o dedo)
    const mBase = mat(scene, 'mbase', '#3a3d44', 0.2);
    for (let i = 0; i < 4; i++) {
      const sanf = B.MeshBuilder.CreateBox('sanfona', { width: 9.6 - i * 0.2, height: 0.16, depth: 2.6 - i * 0.05 }, scene);
      sanf.position.y = 0.08 + i * 0.17;
      sanf.material = i % 2 ? mBase : mat(scene, 'msanf' + i, '#2b2d33', 0.1);
      sanf.receiveShadows = true;
      this.sombras.addShadowCaster(sanf);
    }
    this.prato = new B.TransformNode('elevador', scene);
    this.prato.position.y = 0.7;
    const mPrato = mat(scene, 'mprato', '#f5b82e', 0.3);
    const prato = B.MeshBuilder.CreateCylinder('prato', { diameter: 12.2, height: 0.16, tessellation: 64 }, scene);
    prato.material = mPrato; prato.parent = this.prato; prato.position.y = 0.0;
    prato.receiveShadows = true;
    const mBorda = mat(scene, 'mborda', '#ffffff', 0.2);
    mBorda.diffuseTexture = texturaZebra(scene);
    mBorda.diffuseTexture.uScale = 6;
    const borda = B.MeshBuilder.CreateCylinder('borda', { diameter: 12.3, height: 0.2, tessellation: 64, cap: B.Mesh.NO_CAP }, scene);
    borda.material = mBorda; borda.parent = this.prato;
    this.prato.rotation.y = 0;
  }

  _aplicarTudo() {
    this.modelo.definirCor(this.pref.cor);
    this.modelo.definirPadrao(this.pref.padrao);
    this.modelo.definirRodas(this.pref.roda);
    this.modelo.definirAcessorios(this.pref.acessorios);
  }

  // ----------------------------- interface -----------------------------
  _montarInterface(aoDirigir) {
    const vibrar = () => { try { navigator.vibrate && navigator.vibrate(15); } catch {} };
    const toque = (el, fn) => el.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); vibrar(); fn(); });

    // bandeja de cores (sempre visível)
    const bandeja = document.getElementById('bandeja-cores');
    bandeja.innerHTML = '';
    for (const cor of CONFIG.cores) {
      const b = document.createElement('button');
      b.className = 'cor-garagem';
      b.style.background = cor;
      b.dataset.cor = cor;
      b.setAttribute('aria-label', 'Cor');
      toque(b, () => {
        this.audio.clique(true);
        this.pref.cor = cor;
        this.modelo.definirCor(cor);
        this._marcar();
        this.aoMudar(this.pref);
      });
      bandeja.appendChild(b);
    }

    toque(document.getElementById('btn-cacamba-garagem'), () => {
      this.alvoCacamba = this.alvoCacamba ? 0 : 1;
      this.audio.clique(this.alvoCacamba === 1);
    });
    toque(document.getElementById('btn-dirigir'), () => { this.audio.clique(true); aoDirigir(); });
    toque(document.getElementById('cat-anterior'), () => this._trocarCategoria(-1));
    toque(document.getElementById('cat-proxima'), () => this._trocarCategoria(1));
    this._montarPrateleira();
  }

  _trocarCategoria(passo) {
    this.categoria = (this.categoria + passo + CATEGORIAS.length) % CATEGORIAS.length;
    this.audio.clique(passo > 0);
    this._montarPrateleira();
  }

  _montarPrateleira() {
    const cat = CATEGORIAS[this.categoria];
    document.getElementById('cat-icone').innerHTML = ICONES_CATEGORIA[cat];
    const itens = document.getElementById('itens');
    itens.innerHTML = '';
    const lista = cat === 'pintura' ? TIPOS_PADRAO.map((id) => [id, ICONES_PADRAO[id]])
      : cat === 'rodas' ? TIPOS_RODA.map((t) => [t.id, ICONES_RODA[t.id]])
        : TIPOS_ACESSORIO.map((id) => [id, ICONES_ACESSORIO[id]]);
    for (const [id, icone] of lista) {
      const b = document.createElement('button');
      b.className = 'item';
      b.dataset.id = id;
      b.innerHTML = icone + '<span class="pe"></span>';
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        try { navigator.vibrate && navigator.vibrate(15); } catch {}
        this._escolher(cat, id);
      });
      itens.appendChild(b);
    }
    itens.classList.remove('entrando');
    void itens.offsetWidth;
    itens.classList.add('entrando');
    this._marcar();
  }

  _escolher(cat, id) {
    if (cat === 'pintura') {
      this.pref.padrao = id;
      this.modelo.definirPadrao(id);
    } else if (cat === 'rodas') {
      this.pref.roda = id;
      this.modelo.definirRodas(id);
    } else {
      const l = new Set(this.pref.acessorios);
      if (l.has(id)) l.delete(id); else l.add(id);
      this.pref.acessorios = [...l];
      this.modelo.definirAcessorios(this.pref.acessorios);
    }
    this.audio.clique(true);
    this.pulo = 0.35;   // o caminhão dá um pulinho no elevador
    this._marcar();
    this.aoMudar(this.pref);
  }

  _marcar() {
    for (const b of document.querySelectorAll('.cor-garagem')) b.classList.toggle('selecionada', b.dataset.cor === this.pref.cor);
    const cat = CATEGORIAS[this.categoria];
    for (const b of document.querySelectorAll('#itens .item')) {
      const id = b.dataset.id;
      const sel = cat === 'pintura' ? this.pref.padrao === id : cat === 'rodas' ? this.pref.roda === id : this.pref.acessorios.includes(id);
      b.classList.toggle('selecionado', sel);
    }
  }

  ativar() {
    this.ativa = true;
    this.scene.activeCamera = this.cam;
    this._aplicarTudo();
    this._marcar();
    this.altElevador = 0;
    document.getElementById('tela-garagem').classList.remove('escondido');
  }

  desativar() {
    this.ativa = false;
    this.arrasto = null;
    this.alvoCacamba = 0;
    this.modelo.definirCacamba(0);
    this.audio.hidraulico(false);
    document.getElementById('tela-garagem').classList.add('escondido');
  }

  atualizar(dt) {
    this.tempo += dt;
    // elevador sobe ao entrar na garagem; o caminhão gira sozinho se ninguém mexer
    this.altElevador = Math.min(1, this.altElevador + dt * 0.8);
    const e = 1 - Math.pow(1 - this.altElevador, 3);
    this.pulo = Math.max(0, (this.pulo || 0) - dt);
    this.prato.position.y = 0.15 + e * 0.55 + Math.sin(this.pulo * 9) * this.pulo * 0.35;
    if (this.tempo - this.ultimoToque > 4) this.giro.rotation.y += dt * 0.3;
    for (const { g, giroVel } of this.engrenagens) g.rotation.y += dt * giroVel;

    const atual = this.modelo.cacamba;
    const mexendo = Math.abs(atual - this.alvoCacamba) > 0.001;
    if (mexendo) {
      const falta = this.alvoCacamba - atual;
      this.modelo.definirCacamba(atual + Math.sign(falta) * Math.min(Math.abs(falta), dt * 0.3));
    }
    this.audio.hidraulico(mexendo);
    // rodas giram devagar (para a de fogo e o giroflex ficarem vivos)
    this.modelo.animarRodas(dt * 0.6, 0, dt);
    this.scene.render();
  }
}

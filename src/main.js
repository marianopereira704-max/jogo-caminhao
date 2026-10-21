// Ponto de partida do jogo: liga a engine, monta o mundo e roda o laço principal.
import { CONFIG } from './config.js';
import { carregar, salvar } from './salvar.js';
import { Audio } from './audio.js';
import { Controles } from './controles.js';
import { Caminhao } from './caminhao.js';
import { CameraSeguir } from './camera.js';
import { MundoTeste } from './mundo-teste.js';

const B = window.BABYLON;
if (!B) throw new Error('Babylon.js não carregou. Confira a internet e recarregue.');

const canvas = document.getElementById('tela-jogo');
const engine = new B.Engine(canvas, true, { preserveDrawingBuffer: false, stencil: false, antialias: true }, true);
// limita a resolução: tela muito densa gasta bateria sem diferença visível
const ajustarResolucao = () => {
  const dpr = window.devicePixelRatio || 1;
  engine.setHardwareScalingLevel(dpr / Math.min(dpr, CONFIG.resolucaoMax));
};
ajustarResolucao();

const scene = new B.Scene(engine);
scene.skipPointerMovePicking = true;
scene.autoClear = true;

const preferencias = carregar();
const audio = new Audio();
const mundo = new MundoTeste(scene);
const caminhao = new Caminhao(scene, mundo.sombras);
const camera = new CameraSeguir(scene, canvas);

const voltarParaEstrada = () => {
  const i = mundo.inicio;
  caminhao.colocarEm(i.x, i.z, i.angulo);
  camera.pular(caminhao);
};
voltarParaEstrada();

caminhao.aoEncostar = () => { audio.toc(); try { navigator.vibrate && navigator.vibrate(40); } catch {} };

const controles = new Controles({
  audio,
  preferencias,
  aoTrocarMarcha: (m) => { if (caminhao.pedirMarcha(m)) audio.clique(m === 'D'); },
  aoBuzinar: (ligada) => audio.buzina(ligada),
  aoVoltarEstrada: voltarParaEstrada,
  aoMudarPreferencias: (p) => salvar(p),
});

// ----- Tela inicial: o primeiro toque libera tela cheia, som e sensores -----
document.getElementById('btn-jogar').addEventListener('pointerdown', async (e) => {
  e.preventDefault();
  audio.iniciar();
  audio.clique(true);
  try {
    const raiz = document.documentElement;
    if (raiz.requestFullscreen && !document.fullscreenElement) await raiz.requestFullscreen({ navigationUI: 'hide' });
  } catch {}
  try { await screen.orientation.lock('landscape'); } catch {}
  if (preferencias.modoDirecao === 'inclinacao') controles.pedirPermissaoSensor();
  document.getElementById('tela-inicio').classList.add('escondido');
  document.getElementById('hud').classList.remove('escondido');
  jogando = true;
});

// ----- Laço principal, limitado a 30 quadros por segundo -----
const elVel = document.getElementById('vel');
let jogando = false;
let ultimo = performance.now();
const intervalo = 1000 / CONFIG.fps;

engine.runRenderLoop(() => {
  const agora = performance.now();
  if (agora - ultimo < intervalo - 2) return;     // ainda não é hora do próximo quadro
  const dt = Math.min((agora - ultimo) / 1000, 0.1);
  ultimo = agora;

  if (jogando) {
    controles.atualizar();
    caminhao.atualizar(dt, controles.estado, mundo);
    controles.mostrarMarcha(caminhao.marchaPendente || caminhao.marcha, !!caminhao.marchaPendente);
    audio.atualizarMotor(Math.abs(caminhao.velocidade) / CONFIG.velMaxFrente, controles.estado.acelerar);
    audio.atualizarBipRe(caminhao.marcha === 'R' && !caminhao.marchaPendente, dt);
    elVel.textContent = Math.round(caminhao.velocidadeKmh);
  }
  camera.atualizar(caminhao, dt);
  mundo.seguirSol(caminhao.posicao);
  scene.render();
});

window.addEventListener('resize', () => { ajustarResolucao(); engine.resize(); });

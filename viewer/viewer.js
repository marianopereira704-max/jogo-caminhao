// Visualizador para aprovar modelos: gira, aproxima, testa cor, caçamba, rodas e noite.
import { montarCacamba8x4 } from '../src/modelos/cacamba-8x4.js';

const B = window.BABYLON;
const canvas = document.getElementById('tela');
const engine = new B.Engine(canvas, true, { antialias: true, stencil: false }, true);
engine.setHardwareScalingLevel(1 / Math.min(window.devicePixelRatio || 1, 3));
const scene = new B.Scene(engine);

// ----- luz e cenário -----
const ceuDia = new B.Color4(0.72, 0.84, 0.93, 1);
const ceuNoite = new B.Color4(0.04, 0.06, 0.12, 1);
scene.clearColor = ceuDia;
const ambiente = new B.HemisphericLight('amb', new B.Vector3(0, 1, 0), scene);
ambiente.intensity = 0.95;
ambiente.groundColor = new B.Color3(0.5, 0.5, 0.52);
const sol = new B.DirectionalLight('sol', new B.Vector3(0.45, -1, -0.5), scene);
sol.position = new B.Vector3(-20, 30, 20);
sol.intensity = 0.85;
const sombras = new B.ShadowGenerator(2048, sol);
sombras.usePercentageCloserFiltering = true;
sombras.darkness = 0.3;
sombras.bias = 0.002;

const chao = B.MeshBuilder.CreateDisc('chao', { radius: 14, tessellation: 64 }, scene);
chao.rotation.x = Math.PI / 2;
const mChao = new B.StandardMaterial('mchao', scene);
mChao.diffuseColor = B.Color3.FromHexString('#8f9499');
mChao.specularColor = B.Color3.Black();
chao.material = mChao;
chao.receiveShadows = true;

// ----- caminhão -----
const modelo = montarCacamba8x4(scene);
for (const p of modelo.partes) sombras.addShadowCaster(p);

// ----- câmera que gira com o dedo -----
const cam = new B.ArcRotateCamera('cam', Math.PI * 0.72, 1.2, 17, new B.Vector3(0, 1.6, 0), scene);
cam.attachControl(canvas, true);
cam.lowerRadiusLimit = 4;
cam.upperRadiusLimit = 30;
cam.upperBetaLimit = Math.PI / 2 - 0.03;
cam.wheelDeltaPercentage = 0.01;
cam.pinchDeltaPercentage = 0.004;
cam.panningSensibility = 0;
cam.minZ = 0.1;

const vistas = {
  '34':    { a: Math.PI * 0.72, b: 1.2, r: 17 },
  lado:    { a: Math.PI, b: Math.PI / 2 - 0.05, r: 16 },
  frente:  { a: Math.PI / 2, b: 1.45, r: 10 },
  tras:    { a: -Math.PI / 2, b: 1.35, r: 12 },
  cima:    { a: Math.PI * 0.72, b: 0.15, r: 20 },
};
let animVista = null;
for (const el of document.querySelectorAll('[data-vista]')) {
  el.addEventListener('click', () => {
    const v = vistas[el.dataset.vista];
    animVista = { de: { a: cam.alpha, b: cam.beta, r: cam.radius }, para: v, t: 0 };
  });
}

// ----- cores (as 8 da paleta) -----
const cores = ['#f4f5f2', '#d42a20', '#1f5fbf', '#f5c518', '#2f9e44', '#f07a1a', '#7b3fb5', '#2a2c2e'];
const caixaCores = document.getElementById('cores');
cores.forEach((c, i) => {
  const b = document.createElement('button');
  b.className = 'cor' + (i === 0 ? ' ativo' : '');
  b.style.background = c;
  b.addEventListener('click', () => {
    modelo.definirCor(c);
    for (const o of caixaCores.children) o.classList.remove('ativo');
    b.classList.add('ativo');
  });
  caixaCores.appendChild(b);
});

// ----- botões -----
let alvoCacamba = 0;
const btnCac = document.getElementById('btn-cacamba');
btnCac.addEventListener('click', () => {
  alvoCacamba = alvoCacamba ? 0 : 1;
  btnCac.classList.toggle('ativo', !!alvoCacamba);
  btnCac.textContent = alvoCacamba ? 'Abaixar caçamba' : 'Levantar caçamba';
});

let rodando = false;
const btnRodas = document.getElementById('btn-rodas');
btnRodas.addEventListener('click', () => { rodando = !rodando; btnRodas.classList.toggle('ativo', rodando); });

// noite: céu escuro, faróis acesos com fachos de luz
const fachos = [-0.95, 0.95].map((x) => {
  const l = new B.SpotLight('facho', new B.Vector3(x, 1.72, 5.2), new B.Vector3(0, -0.18, 1), 0.75, 8, scene);
  l.diffuse = new B.Color3(1, 0.95, 0.8);
  l.intensity = 0;
  l.range = 30;
  return l;
});
let noite = false;
const btnNoite = document.getElementById('btn-noite');
btnNoite.addEventListener('click', () => {
  noite = !noite;
  btnNoite.classList.toggle('ativo', noite);
  scene.clearColor = noite ? ceuNoite : ceuDia;
  ambiente.intensity = noite ? 0.3 : 0.95;
  sol.intensity = noite ? 0.08 : 0.85;
  for (const f of fachos) f.intensity = noite ? 2.2 : 0;
  modelo.farois(noite);
});

// ----- laço -----
let tempo = 0;
engine.runRenderLoop(() => {
  const dt = Math.min(engine.getDeltaTime() / 1000, 0.1);
  tempo += dt;

  const atual = modelo.cacamba;
  if (Math.abs(atual - alvoCacamba) > 0.001) {
    modelo.definirCacamba(atual + Math.sign(alvoCacamba - atual) * Math.min(Math.abs(alvoCacamba - atual), dt * 0.25));
  }
  if (rodando) modelo.animarRodas(dt * 3, Math.sin(tempo * 1.2));

  if (animVista) {
    animVista.t = Math.min(1, animVista.t + dt * 1.6);
    const k = 1 - Math.pow(1 - animVista.t, 3);
    const { de, para } = animVista;
    cam.alpha = de.a + (para.a - de.a) * k;
    cam.beta = de.b + (para.b - de.b) * k;
    cam.radius = de.r + (para.r - de.r) * k;
    if (animVista.t >= 1) animVista = null;
  }
  scene.render();
});
window.addEventListener('resize', () => engine.resize());

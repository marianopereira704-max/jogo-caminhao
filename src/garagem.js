// Garagem: o caminhão girando num tablado, onde ele escolhe a cor antes de dirigir.
// É uma cena separada do mundo, com a própria luz e câmera.
import { CONFIG } from './config.js';
import { montarCacamba8x4 } from './modelos/cacamba-8x4.js';
import { criarCeu, criarReflexo } from './reflexo.js';

const B = window.BABYLON;

export class Garagem {
  constructor(engine, canvas, { preferencias, audio, aoMudar, aoDirigir }) {
    this.canvas = canvas;
    this.pref = preferencias;
    this.audio = audio;
    this.aoMudar = aoMudar;

    const scene = this.scene = new B.Scene(engine);
    scene.skipPointerMovePicking = true;
    scene.clearColor = new B.Color4(0.8, 0.86, 0.9, 1);

    // ---- luz ----
    const amb = new B.HemisphericLight('amb', new B.Vector3(0, 1, 0), scene);
    amb.intensity = 0.95;
    amb.groundColor = new B.Color3(0.5, 0.5, 0.52);
    const sol = new B.DirectionalLight('sol', new B.Vector3(0.45, -1, -0.5), scene);
    sol.position = new B.Vector3(-20, 30, 20);
    sol.intensity = 0.85;
    const sombras = new B.ShadowGenerator(2048, sol);
    sombras.usePercentageCloserFiltering = true;
    sombras.darkness = 0.3;
    sombras.bias = 0.002;

    // ---- tablado ----
    const ceu = criarCeu(scene);
    const chao = B.MeshBuilder.CreateDisc('chao', { radius: 40, tessellation: 64 }, scene);
    chao.rotation.x = Math.PI / 2;
    const mChao = new B.StandardMaterial('mchao', scene);
    mChao.diffuseColor = B.Color3.FromHexString('#9aa0a6');
    mChao.specularColor = B.Color3.Black();
    chao.material = mChao;
    chao.receiveShadows = true;
    const tablado = B.MeshBuilder.CreateCylinder('tablado', { diameter: 14, height: 0.12, tessellation: 64 }, scene);
    tablado.position.y = 0.06;
    const mTab = new B.StandardMaterial('mtab', scene);
    mTab.diffuseColor = B.Color3.FromHexString('#c9ccd0');
    mTab.specularColor = new B.Color3(0.3, 0.3, 0.3);
    tablado.material = mTab;
    tablado.receiveShadows = true;
    this.tablado = new B.TransformNode('giro', scene);
    this.tablado.position.y = 0.12;

    // ---- caminhão ----
    this.modelo = montarCacamba8x4(scene);
    this.modelo.raiz.parent = this.tablado;
    this.modelo.usarSombras(sombras);
    this.modelo.definirReflexo(criarReflexo(scene, [ceu, chao]));
    this.modelo.definirCor(this.pref.cor);
    this.modelo.definirRodas(this.pref.roda);

    // ---- câmera: gira sozinha devagar; o dedo também gira ----
    this.cam = new B.ArcRotateCamera('cam', Math.PI * 0.72, 1.25, 15.5, new B.Vector3(0, 1.3, 0), scene);
    this.cam.lowerRadiusLimit = 9;
    this.cam.upperRadiusLimit = 26;
    this.cam.lowerBetaLimit = 0.6;
    this.cam.upperBetaLimit = 1.45;
    this.cam.panningSensibility = 0;
    this.cam.pinchDeltaPercentage = 0.004;
    this.cam.wheelDeltaPercentage = 0.01;
    this.cam.minZ = 0.2;
    this.ultimoToque = -10;
    scene.onPointerObservable.add(() => { this.ultimoToque = this.tempo; });
    this.tempo = 0;
    this.alvoCacamba = 0;

    this._montarBotoes(aoDirigir);
  }

  _montarBotoes(aoDirigir) {
    const vibrar = () => { try { navigator.vibrate && navigator.vibrate(15); } catch {} };
    const caixa = document.getElementById('cores-garagem');
    caixa.innerHTML = '';
    for (const cor of CONFIG.cores) {
      const b = document.createElement('button');
      b.className = 'cor-garagem';
      b.style.background = cor;
      b.dataset.cor = cor;
      b.setAttribute('aria-label', 'Cor');
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        vibrar();
        this.audio.clique(true);
        this.pref.cor = cor;
        this.modelo.definirCor(cor);
        this._marcarCor();
        this.aoMudar(this.pref);
      });
      caixa.appendChild(b);
    }
    this._marcarCor();

    document.getElementById('btn-cacamba-garagem').addEventListener('pointerdown', (e) => {
      e.preventDefault();
      vibrar();
      this.alvoCacamba = this.alvoCacamba ? 0 : 1;
      this.audio.clique(this.alvoCacamba === 1);
    });
    document.getElementById('btn-dirigir').addEventListener('pointerdown', (e) => {
      e.preventDefault();
      vibrar();
      this.audio.clique(true);
      aoDirigir();
    });
  }

  _marcarCor() {
    for (const b of document.querySelectorAll('.cor-garagem')) {
      b.classList.toggle('selecionada', b.dataset.cor === this.pref.cor);
    }
  }

  ativar() {
    this.cam.attachControl(this.canvas, true);
    this.scene.activeCamera = this.cam;
    this.modelo.definirCor(this.pref.cor);
    this._marcarCor();
    document.getElementById('tela-garagem').classList.remove('escondido');
  }

  desativar() {
    this.cam.detachControl();
    this.alvoCacamba = 0;
    this.modelo.definirCacamba(0);
    this.audio.hidraulico(false);
    document.getElementById('tela-garagem').classList.add('escondido');
  }

  atualizar(dt) {
    this.tempo += dt;
    this.modelo.animarRodas(0, 0, dt);
    // gira sozinha se ninguém mexeu nos últimos 4 segundos
    if (this.tempo - this.ultimoToque > 4) this.cam.alpha += dt * 0.25;
    const atual = this.modelo.cacamba;
    const mexendo = Math.abs(atual - this.alvoCacamba) > 0.001;
    if (mexendo) {
      const falta = this.alvoCacamba - atual;
      this.modelo.definirCacamba(atual + Math.sign(falta) * Math.min(Math.abs(falta), dt * 0.3));
    }
    this.audio.hidraulico(mexendo);
    this.scene.render();
  }
}

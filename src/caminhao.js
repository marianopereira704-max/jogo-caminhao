// Caminhão PROVISÓRIO da etapa 1 (blocos simples).
// Serve só para testar os controles; será trocado pela caçamba aprovada.
// Movimento "no trilho": sem física, sem tombar, sem derrapar.
import { CONFIG } from './config.js';

const B = window.BABYLON;

function material(scene, nome, cor, brilho = 0.15) {
  const m = new B.StandardMaterial(nome, scene);
  m.diffuseColor = B.Color3.FromHexString(cor);
  m.specularColor = new B.Color3(brilho, brilho, brilho);
  return m;
}

export class Caminhao {
  constructor(scene, sombras) {
    this.scene = scene;

    // posição e direção no mundo
    this.raiz = new B.TransformNode('caminhao', scene);
    this.velocidade = 0;          // m/s (negativo = ré)
    this.direcaoSuave = 0;        // posição atual do volante (-1 a 1)
    this.marcha = 'D';
    this.marchaPendente = null;   // marcha pedida enquanto ainda está andando
    this.encostado = false;

    this._montar(scene, sombras);
  }

  _montar(scene, sombras) {
    const mCabine = material(scene, 'cabine', '#f2f2ee', 0.35);
    const mCacamba = material(scene, 'cacamba', '#e8791e', 0.2);
    const mChassi = material(scene, 'chassi', '#2a2d31', 0.1);
    const mVidro = material(scene, 'vidro', '#1c2733', 0.8);
    const mPneu = material(scene, 'pneu', '#1a1a1a', 0.05);
    const mAro = material(scene, 'aro', '#b9bec4', 0.6);
    const mFarol = material(scene, 'farol', '#fff6d8', 0.9);
    mFarol.emissiveColor = new B.Color3(0.6, 0.58, 0.45);
    const mLanterna = material(scene, 'lanterna', '#c4161c', 0.5);
    mLanterna.emissiveColor = new B.Color3(0.35, 0.02, 0.02);

    const partes = [];
    const caixa = (nome, larg, alt, comp, x, y, z, mat) => {
      const m = B.MeshBuilder.CreateBox(nome, { width: larg, height: alt, depth: comp }, scene);
      m.position.set(x, y, z);
      m.material = mat;
      m.parent = this.raiz;
      partes.push(m);
      return m;
    };

    // O caminhão aponta para +z (frente). Medidas em metros, parecido com um "toco".
    caixa('longarina', 1.0, 0.35, 7.0, 0, 0.85, -0.2, mChassi);
    caixa('para-choque', 2.5, 0.35, 0.25, 0, 0.75, 3.45, mChassi);

    // cabine
    caixa('cabine', 2.45, 2.1, 1.9, 0, 2.05, 2.35, mCabine);
    caixa('teto', 2.3, 0.18, 1.7, 0, 3.19, 2.3, mCabine);
    caixa('parabrisa', 2.2, 0.85, 0.06, 0, 2.55, 3.31, mVidro);
    caixa('janela-esq', 0.06, 0.75, 1.0, -1.235, 2.5, 2.55, mVidro);
    caixa('janela-dir', 0.06, 0.75, 1.0, 1.235, 2.5, 2.55, mVidro);
    caixa('grade', 1.6, 0.6, 0.06, 0, 1.45, 3.31, mChassi);
    caixa('farol-esq', 0.45, 0.22, 0.08, -0.95, 1.25, 3.33, mFarol);
    caixa('farol-dir', 0.45, 0.22, 0.08, 0.95, 1.25, 3.33, mFarol);

    // caçamba
    caixa('cacamba-fundo', 2.5, 0.2, 4.8, 0, 1.25, -1.15, mCacamba);
    caixa('cacamba-esq', 0.12, 1.1, 4.8, -1.19, 1.9, -1.15, mCacamba);
    caixa('cacamba-dir', 0.12, 1.1, 4.8, 1.19, 1.9, -1.15, mCacamba);
    caixa('cacamba-frente', 2.5, 1.4, 0.15, 0, 2.05, 1.2, mCacamba);
    caixa('cacamba-tampa', 2.5, 1.1, 0.12, 0, 1.9, -3.5, mCacamba);
    caixa('lanterna-esq', 0.3, 0.18, 0.06, -1.0, 1.0, -3.58, mLanterna);
    caixa('lanterna-dir', 0.3, 0.18, 0.06, 1.0, 1.0, -3.58, mLanterna);

    // rodas: pivô (vira) -> giro (roda) -> pneu
    const raio = 0.52;
    this.raioRoda = raio;
    this.rodasDianteiras = [];
    this.giros = [];
    const roda = (x, z, dianteira, dupla) => {
      const pivo = new B.TransformNode('pivo', scene);
      pivo.parent = this.raiz;
      pivo.position.set(x, raio, z);
      const giro = new B.TransformNode('giro', scene);
      giro.parent = pivo;
      const largura = dupla ? 0.62 : 0.34;
      const pneu = B.MeshBuilder.CreateCylinder('pneu', { diameter: raio * 2, height: largura, tessellation: 18 }, scene);
      pneu.rotation.z = Math.PI / 2;
      pneu.material = mPneu;
      pneu.parent = giro;
      // aro com raios, para dar para ver a roda girando
      const lado = Math.sign(x);
      const aro = B.MeshBuilder.CreateCylinder('aro', { diameter: raio * 1.15, height: 0.04, tessellation: 16 }, scene);
      aro.rotation.z = Math.PI / 2;
      aro.position.x = lado * (largura / 2 + 0.01);
      aro.material = mAro;
      aro.parent = giro;
      for (let i = 0; i < 2; i++) {
        const raioAro = B.MeshBuilder.CreateBox('raio-aro', { width: 0.05, height: raio * 1.1, depth: 0.1 }, scene);
        raioAro.position.x = lado * (largura / 2 + 0.03);
        raioAro.rotation.x = i * Math.PI / 2;
        raioAro.material = mChassi;
        raioAro.parent = giro;
        partes.push(raioAro);
      }
      partes.push(pneu, aro);
      this.giros.push(giro);
      if (dianteira) this.rodasDianteiras.push(pivo);
    };
    roda(-1.05, 2.55, true, false);
    roda(1.05, 2.55, true, false);
    roda(-0.95, -2.1, false, true);
    roda(0.95, -2.1, false, true);

    for (const p of partes) sombras.addShadowCaster(p);
  }

  get posicao() { return this.raiz.position; }
  get angulo() { return this.raiz.rotation.y; }
  get frente() { return new B.Vector3(Math.sin(this.angulo), 0, Math.cos(this.angulo)); }
  get velocidadeKmh() { return Math.abs(this.velocidade) * 3.6; }

  colocarEm(x, z, angulo) {
    this.raiz.position.set(x, 0, z);
    this.raiz.rotation.y = angulo;
    this.velocidade = 0;
    this.direcaoSuave = 0;
    this.marchaPendente = null;
    this.marcha = 'D';
  }

  // Pedido do câmbio. Se estiver andando no sentido contrário, freia sozinho antes.
  pedirMarcha(m) {
    if (m === this.marcha && !this.marchaPendente) return false;
    if (m === this.marcha) { this.marchaPendente = null; return true; }
    if (Math.abs(this.velocidade) < 0.3) {
      this.marcha = m;
      this.marchaPendente = null;
    } else {
      this.marchaPendente = m;
    }
    return true;
  }

  // dt: segundos desde o último quadro. entrada: { direcao, acelerar, frear }
  // mundo.bateu(pontos) diz se algum ponto do caminhão encostou em algo.
  atualizar(dt, entrada, mundo) {
    const C = CONFIG;
    const aproximar = (v, alvo, passo) => (v < alvo ? Math.min(v + passo, alvo) : Math.max(v - passo, alvo));

    // ---- velocidade ----
    if (this.marchaPendente) {
      this.velocidade = aproximar(this.velocidade, 0, C.freio * dt);
      if (Math.abs(this.velocidade) < 0.3) {
        this.velocidade = 0;
        this.marcha = this.marchaPendente;
        this.marchaPendente = null;
      }
    } else if (entrada.frear) {
      this.velocidade = aproximar(this.velocidade, 0, C.freio * dt);
    } else if (entrada.acelerar) {
      if (this.marcha === 'D') this.velocidade = aproximar(this.velocidade, C.velMaxFrente, C.aceleracao * dt);
      else this.velocidade = aproximar(this.velocidade, -C.velMaxRe, C.aceleracaoRe * dt);
    } else {
      this.velocidade = aproximar(this.velocidade, 0, C.rolagem * dt);
    }

    // ---- volante ----
    this.direcaoSuave = aproximar(this.direcaoSuave, entrada.direcao, C.suavizarDirecao * dt);

    // só vira andando (na ré, a frente vai para o lado contrário, como na vida real)
    const fator = Math.max(-1, Math.min(1, this.velocidade / C.velGiroCheio));
    const novoAngulo = this.angulo + this.direcaoSuave * C.giroMax * fator * dt;

    // ---- nova posição ----
    const passo = this.velocidade * dt;
    const nx = this.posicao.x + Math.sin(novoAngulo) * passo;
    const nz = this.posicao.z + Math.cos(novoAngulo) * passo;

    // pontos de contato: frente e traseira do caminhão
    const fx = Math.sin(novoAngulo), fz = Math.cos(novoAngulo);
    const pontos = [
      { x: nx + fx * 2.4, z: nz + fz * 2.4 },
      { x: nx - fx * 2.2, z: nz - fz * 2.2 },
    ];

    if (Math.abs(passo) > 0 && mundo.bateu(pontos, 1.4)) {
      // encostou: para na hora, sem dano
      if (!this.encostado) this.aoEncostar && this.aoEncostar();
      this.encostado = true;
      this.velocidade = 0;
    } else {
      if (Math.abs(passo) > 0.001) this.encostado = false;
      this.raiz.rotation.y = novoAngulo;
      this.posicao.x = nx;
      this.posicao.z = nz;
    }

    // ---- animação das rodas ----
    for (const g of this.giros) g.rotation.x += (this.velocidade * dt) / this.raioRoda;
    for (const p of this.rodasDianteiras) p.rotation.y = this.direcaoSuave * 0.5;
  }
}

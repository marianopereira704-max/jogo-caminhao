// Depósito de materiais (norte) e obra (sul), ligados aos balões da avenida.
// O depósito tem 4 baias lado a lado; o caminhão entra numa baia e é carregado.
// Na obra ele descarrega (a carga fica lá, empilhando).
import { L } from './litoral.js';
import { juntarPorMaterial } from '../modelos/formas.js';

const B = window.BABYLON;

export const TIPOS_CARGA = ['areia', 'pedra', 'tora', 'tabua'];
const NOMES = { areia: 'AREIA', pedra: 'PEDRA', tora: 'TORAS', tabua: 'TÁBUAS' };
const CORES = { areia: '#e2b65a', pedra: '#8d939a', tora: '#8a5a33', tabua: '#d9ae72' };

function mat(scene, nome, cor, brilho = 0.05, emissivo = null) {
  const m = new B.StandardMaterial(nome, scene);
  m.diffuseColor = B.Color3.FromHexString(cor);
  m.specularColor = new B.Color3(brilho, brilho, brilho);
  if (emissivo) m.emissiveColor = B.Color3.FromHexString(emissivo);
  return m;
}

// placa grande da baia: cor do material + desenho + nome
function texPlaca(scene, tipo) {
  const t = new B.DynamicTexture('placa-' + tipo, { width: 512, height: 256 }, scene, true);
  const c = t.getContext();
  c.fillStyle = '#1f2a36'; c.fillRect(0, 0, 512, 256);
  c.fillStyle = CORES[tipo]; c.fillRect(12, 12, 488, 232);
  c.fillStyle = 'rgba(0,0,0,.12)'; c.fillRect(12, 190, 488, 54);
  // desenho do material (lado esquerdo)
  c.save(); c.translate(110, 120);
  if (tipo === 'areia') {
    c.fillStyle = '#f6dc98'; c.beginPath(); c.moveTo(-80, 60); c.quadraticCurveTo(0, -90, 80, 60); c.fill();
    c.fillStyle = 'rgba(120,80,20,.35)'; for (let i = 0; i < 40; i++) c.fillRect(-60 + Math.random() * 120, 20 + Math.random() * 35, 3, 3);
  } else if (tipo === 'pedra') {
    c.fillStyle = '#c9ced3';
    for (const [x, y, r] of [[-40, 30, 34], [30, 35, 30], [-5, -15, 32], [55, -5, 22], [-60, -10, 20]]) { c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); c.strokeStyle = '#5c6268'; c.lineWidth = 4; c.stroke(); }
  } else if (tipo === 'tora') {
    for (const [x, y] of [[-45, 30], [10, 30], [65, 30], [-18, -20], [38, -20]]) {
      c.fillStyle = '#6b4424'; c.beginPath(); c.arc(x - 10, y, 26, 0, 7); c.fill();
      c.fillStyle = '#e7c48e'; c.beginPath(); c.arc(x - 10, y, 20, 0, 7); c.fill();
      c.strokeStyle = '#b08350'; c.lineWidth = 3; c.beginPath(); c.arc(x - 10, y, 11, 0, 7); c.stroke();
    }
  } else {
    for (let i = 0; i < 5; i++) { c.fillStyle = i % 2 ? '#f0cc92' : '#e3b778'; c.fillRect(-85, -50 + i * 22, 170, 18); c.strokeStyle = '#8a6236'; c.lineWidth = 3; c.strokeRect(-85, -50 + i * 22, 170, 18); }
  }
  c.restore();
  c.fillStyle = '#1f2a36'; c.font = 'bold 84px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(NOMES[tipo], 350, 118, 290);
  t.update();
  return t;
}

export class Patios {
  constructor(scene, mundo) {
    this.scene = scene;
    this.mundo = mundo;
    this.tempo = 0;
    this.raiz = new B.TransformNode('patios', scene);   // peças fixas (juntadas no fim)
    this.M = {
      chao: mat(scene, 'patio-chao', '#b3aa98', 0.02),
      faixa: mat(scene, 'patio-faixa', '#f2c230', 0.05),
      metal: mat(scene, 'patio-metal', '#e0a516', 0.3),
      aco: mat(scene, 'patio-aco', '#5b6168', 0.4),
      concreto: mat(scene, 'patio-concreto', '#c9c5bd', 0.02),
      esteira: mat(scene, 'patio-esteira', '#2b2d30', 0.1),
      areia: mat(scene, 'patio-areia', '#d9b979', 0.02),
      pedra: mat(scene, 'patio-pedra', '#8f949a', 0.1),
      madeiraCasca: mat(scene, 'patio-tora', '#6e4a2c', 0.02),
      madeira: mat(scene, 'patio-tabua', '#d4a868', 0.05),
      tapume: mat(scene, 'patio-tapume', '#3f7f53', 0.05),
      laranja: mat(scene, 'patio-laranja', '#f07a1a', 0.2),
    };
    for (const m of [this.M.chao, this.M.faixa]) m.zOffset = -3;
    this.M.faixa.zOffset = -5;
    this.baias = [];
    this._deposito(scene);
    this._obra(scene);
    juntarPorMaterial(this.raiz);
    for (const m of this.raiz.getChildMeshes(true)) { m.receiveShadows = true; if (!m.name.startsWith('chao')) mundo.sombras.addShadowCaster(m); }
  }

  _caixa(w, h, d, x, y, z, m, pai = this.raiz, nome = 'peca') {
    const b = B.MeshBuilder.CreateBox(nome, { width: w, height: h, depth: d }, this.scene);
    b.position.set(x, y, z); b.material = m; b.parent = pai; return b;
  }

  _cil(d, h, x, y, z, m, pai = this.raiz, opcoes = {}) {
    const c = B.MeshBuilder.CreateCylinder('cil', { diameter: d, height: h, tessellation: opcoes.lados || 12, diameterTop: opcoes.topo }, this.scene);
    c.position.set(x, y, z); c.material = m; c.parent = pai; return c;
  }

  _chao(x0, x1, z0, z1) {
    const g = B.MeshBuilder.CreateGround('chao-patio', { width: x1 - x0, height: z1 - z0 }, this.scene);
    g.position.set((x0 + x1) / 2, 0.025, (z0 + z1) / 2); g.material = this.M.chao; g.parent = this.raiz;
  }

  // ===================== DEPÓSITO (norte) =====================
  _deposito(scene) {
    const z0 = L.patioZ[0], z1 = L.patioZ[1];
    const x0 = -12, x1 = 54;
    this._chao(x0, x1, z0, z1);
    const larg = (x1 - x0) / 4;          // 16,5 m por baia
    const zb = 412, comp = 26;           // centro e comprimento das baias
    TIPOS_CARGA.forEach((tipo, i) => {
      const cx = x0 + larg * (i + 0.5);
      // faixas amarelas no chão marcando a baia
      for (const s of [-1, 1]) this._caixa(0.35, 0.02, comp, cx + s * (larg / 2 - 0.6), 0.03, zb, this.M.faixa);
      // pórtico de entrada com a placa
      const zp = zb - comp / 2;
      for (const s of [-1, 1]) this._caixa(0.4, 7.4, 0.4, cx + s * (larg / 2 - 0.6), 3.7, zp, this.M.metal);
      this._caixa(larg - 0.8, 0.5, 0.5, cx, 7.3, zp, this.M.metal);
      const mp = new B.StandardMaterial('placa-baia-' + tipo, scene);
      mp.diffuseTexture = texPlaca(scene, tipo); mp.emissiveColor = new B.Color3(0.25, 0.25, 0.25); mp.backFaceCulling = false;
      const placa = B.MeshBuilder.CreatePlane('placa-baia', { width: 8, height: 4 }, scene);
      placa.position.set(cx, 9.4, zp - 0.05); placa.material = mp;   // de frente para quem chega (sul)
      for (const s of [-1, 1]) this.mundo.obstaculos.push({ x: cx + s * (larg / 2 - 0.6), z: zp, r: 0.45 });

      const baia = { tipo, x0: cx - larg / 2 + 1, x1: cx + larg / 2 - 1, z0: zb - comp / 2 + 2, z1: zb + comp / 2 - 2, cx, cz: zb };
      if (tipo === 'areia' || tipo === 'pedra') this._funil(baia, tipo);
      else this._portico(baia, tipo);
      this.baias.push(baia);
    });
  }

  // funil alto sobre a baia + esteira vindo do monte (areia e pedra)
  _funil(baia, tipo) {
    const { cx, cz } = baia;
    const m = tipo === 'areia' ? this.M.areia : this.M.pedra;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      this._caixa(0.35, 8, 0.35, cx + sx * 5, 4, cz + sz * 1.8, this.M.metal);
      this.mundo.obstaculos.push({ x: cx + sx * 5, z: cz + sz * 1.8, r: 0.3 });
    }
    this._caixa(10.4, 0.3, 4, cx, 8, cz, this.M.metal);
    const funil = this._cil(4.2, 2.6, cx, 9.4, cz, this.M.aco, this.raiz, { topo: 4.2, lados: 4 });
    funil.rotation.y = Math.PI / 4;
    const bico = this._cil(0.7, 1.6, cx, 7.3, cz, this.M.aco, this.raiz, { topo: 2.2, lados: 8 });
    bico.scaling.y = 1;
    baia.bico = new B.Vector3(cx, 6.4, cz);
    // monte do material atrás da baia e a esteira subindo até o funil
    const monte = this._cil(14, 7, cx, 3.2, cz + 30, m, this.raiz, { topo: 0.6, lados: 18 });
    monte.scaling.y = 0.9;
    // esteira: do alto do monte (atrás) até a boca do funil
    const esteira = this._caixa(1.4, 0.3, 26.5, cx, 7.05, cz + 15.25, this.M.esteira);
    esteira.rotation.x = Math.atan2(7.1, 25.5);
    for (let k = 0; k < 4; k++) this._caixa(0.25, 6 - k * 1.2, 0.25, cx, (6 - k * 1.2) / 2, cz + 6 + k * 6, this.M.metal);
    this.mundo.obstaculos.push({ x: cx, z: cz + 30, r: 7 });
    baia.equipamento = 'funil';
  }

  // pórtico com garra (toras) ou garfos (tábuas) e a pilha ao lado
  _portico(baia, tipo) {
    const { cx, cz } = baia;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      this._caixa(0.45, 9, 0.45, cx + sx * 5, 4.5, cz + sz * 3, this.M.metal);
      this.mundo.obstaculos.push({ x: cx + sx * 5, z: cz + sz * 3, r: 0.35 });
    }
    for (const sz of [-1, 1]) this._caixa(10.4, 0.6, 0.5, cx, 9.2, cz + sz * 3, this.M.metal);
    const viga = this._caixa(1.2, 0.5, 6.5, cx, 9.4, cz, this.M.metal);
    viga.name = 'viga';
    // garra/garfo: peça que se mexe (fica fora da junção)
    const ferramenta = new B.TransformNode('ferramenta-' + tipo, this.scene);
    ferramenta.position.set(cx, 7.5, cz);
    const cabo = B.MeshBuilder.CreateCylinder('cabo', { diameter: 0.08, height: 2 }, this.scene);
    cabo.material = this.M.aco; cabo.parent = ferramenta; cabo.position.y = 1;
    if (tipo === 'tora') {
      const barra = B.MeshBuilder.CreateBox('garra', { width: 0.5, height: 0.4, depth: 5.8 }, this.scene);
      barra.material = this.M.laranja; barra.parent = ferramenta;
      for (const z of [-2.2, 2.2]) for (const s of [-1, 1]) {
        const dedo = B.MeshBuilder.CreateBox('dedo', { width: 0.15, height: 1.1, depth: 0.25 }, this.scene);
        dedo.material = this.M.aco; dedo.parent = ferramenta; dedo.position.set(s * 0.55, -0.55, z); dedo.rotation.z = s * 0.35;
      }
      // pilha de toras ao lado
      for (let n = 0; n < 9; n++) {
        const fila = n < 4 ? 0 : n < 7 ? 1 : 2;
        const col = n < 4 ? n : n < 7 ? n - 4 : n - 7;
        const t = this._cil(0.9, 7, cx - 1.5 + col * 0.95 + fila * 0.47, 0.45 + fila * 0.8, cz + 24, this.M.madeiraCasca, this.raiz, { lados: 10 });
        t.rotation.x = Math.PI / 2;
      }
    } else {
      const barra = B.MeshBuilder.CreateBox('garfo', { width: 2.6, height: 0.3, depth: 0.4 }, this.scene);
      barra.material = this.M.laranja; barra.parent = ferramenta;
      for (const s of [-1, 1]) {
        const lado = B.MeshBuilder.CreateBox('garfo', { width: 0.15, height: 1.6, depth: 0.15 }, this.scene);
        lado.material = this.M.aco; lado.parent = ferramenta; lado.position.set(s * 1.25, -0.8, 0);
        const dente = B.MeshBuilder.CreateBox('garfo', { width: 0.18, height: 0.12, depth: 5.6 }, this.scene);
        dente.material = this.M.aco; dente.parent = ferramenta; dente.position.set(s * 1.1, -1.6, 0);
      }
      // paletes de tábuas ao lado
      for (const dx of [-3, 0, 3]) for (let k = 0; k < 6; k++) this._caixa(2.4, 0.2, 5.2, cx + dx, 0.2 + k * 0.22, cz + 24, k === 0 ? this.M.madeiraCasca : this.M.madeira);
    }
    this.mundo.obstaculos.push({ x: cx, z: cz + 24, mx: 5, mz: 3.5 });
    baia.ferramenta = ferramenta;
    baia.equipamento = tipo === 'tora' ? 'garra' : 'garfo';
    baia.alturaFerramenta = 7.5;
  }

  // ===================== OBRA (sul) =====================
  _obra(scene) {
    const z0 = -L.patioZ[1], z1 = -L.patioZ[0];
    const x0 = -12, x1 = 54;
    this._chao(x0, x1, z0, z1);
    this.zonaObra = { x0, x1, z0, z1: z1 + 2 };
    // prédio em construção: lajes e pilares de concreto, andaime laranja
    const px = 4, pz = -448;
    for (let a = 0; a < 5; a++) {
      this._caixa(18, 0.35, 14, px, 0.2 + a * 3.2, pz, this.M.concreto);
      if (a < 4) for (const sx of [-1, 0, 1]) for (const sz of [-1, 1]) this._caixa(0.5, 3.2, 0.5, px + sx * 8, 1.8 + a * 3.2, pz + sz * 6, this.M.concreto);
    }
    for (let a = 0; a < 4; a++) for (const sx of [-1, 1]) this._caixa(0.08, 3.2, 0.08, px + sx * 9.3, 1.8 + a * 3.2, pz + 7.4, this.M.laranja);
    for (let a = 1; a < 5; a++) this._caixa(18.8, 0.08, 0.08, px, a * 3.2, pz + 7.4, this.M.laranja);
    this.mundo.obstaculos.push({ x: px, z: pz, mx: 9.5, mz: 7.5 });
    // guindaste de torre (a lança gira devagar)
    const gx = 42, gz = -456;
    this._caixa(1.6, 34, 1.6, gx, 17, gz, this.M.metal);
    for (let y = 2; y < 34; y += 2) this._caixa(1.7, 0.12, 1.7, gx, y, gz, this.M.aco);
    this.mundo.obstaculos.push({ x: gx, z: gz, r: 1.4 });
    this.lanca = new B.TransformNode('lanca', scene);
    this.lanca.position.set(gx, 34.5, gz);
    const lanca = B.MeshBuilder.CreateBox('lanca', { width: 30, height: 1.1, depth: 1.1 }, scene);
    lanca.material = this.M.metal; lanca.parent = this.lanca; lanca.position.x = -9;
    const contra = B.MeshBuilder.CreateBox('contrapeso', { width: 3, height: 2, depth: 2 }, scene);
    contra.material = this.M.concreto; contra.parent = this.lanca; contra.position.x = 6;
    const cabine = B.MeshBuilder.CreateBox('cabine-guindaste', { width: 2, height: 2, depth: 2 }, scene);
    cabine.material = this.M.aco; cabine.parent = this.lanca; cabine.position.set(1.6, -1.2, 0);
    const caboG = B.MeshBuilder.CreateCylinder('cabo', { diameter: 0.08, height: 12 }, scene);
    caboG.material = this.M.aco; caboG.parent = this.lanca; caboG.position.set(-20, -6, 0);
    const carga = B.MeshBuilder.CreateBox('carga-guindaste', { width: 2, height: 1, depth: 2 }, scene);
    carga.material = this.M.madeira; carga.parent = this.lanca; carga.position.set(-20, -12.5, 0);
    for (const m of [lanca, contra, cabine, caboG, carga]) this.mundo.sombras.addShadowCaster(m);
    // betoneira estacionária e cones
    const bx = 24, bz = -455;
    const tambor = this._cil(2.2, 3, bx, 2.2, bz, this.M.laranja, this.raiz, { topo: 1.2, lados: 14 });
    tambor.rotation.z = Math.PI / 2.6;
    this._caixa(2.4, 1, 3, bx, 0.5, bz, this.M.aco);
    this.mundo.obstaculos.push({ x: bx, z: bz, r: 2 });
    for (let k = 0; k < 6; k++) this._cil(0.5, 0.8, -6 + k * 3, 0.4, -372, this.M.laranja, this.raiz, { topo: 0.05, lados: 10 });
    // tapume verde nas laterais e placa OBRA
    this._caixa(0.2, 2.4, z1 - z0, x0, 1.2, (z0 + z1) / 2, this.M.tapume);
    const mo = new B.StandardMaterial('placa-obra', scene);
    const t = new B.DynamicTexture('tex-obra', { width: 512, height: 256 }, scene, true);
    const c = t.getContext();
    c.fillStyle = '#f5c400'; c.fillRect(0, 0, 512, 256);
    c.fillStyle = '#1b1b1b'; for (let x = -64; x < 512; x += 64) { c.beginPath(); c.moveTo(x, 256); c.lineTo(x + 32, 256); c.lineTo(x + 64, 200); c.lineTo(x + 32, 200); c.fill(); }
    c.font = 'bold 110px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('OBRA', 256, 100);
    t.update();
    mo.diffuseTexture = t; mo.emissiveColor = new B.Color3(0.2, 0.2, 0.2); mo.backFaceCulling = false;
    const placa = B.MeshBuilder.CreatePlane('placa-obra', { width: 9, height: 4.5 }, scene);
    placa.position.set(42, 8, z1 - 1); placa.material = mo;
    for (const s of [-1, 1]) this._caixa(0.3, 8, 0.3, 42 + s * 4, 4, z1 - 1, this.M.aco);
    this.mundo.obstaculos.push({ x: 38, z: z1 - 1, r: 0.4 }, { x: 46, z: z1 - 1, r: 0.4 });
  }

  // a baia em que um ponto está (ou nenhuma)
  baiaEm(x, z) {
    return this.baias.find((b) => x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1) || null;
  }

  naObra(x, z) {
    const o = this.zonaObra;
    return x > o.x0 && x < o.x1 && z > o.z0 && z < o.z1;
  }

  atualizar(dt) {
    this.tempo += dt;
    this.lanca.rotation.y = Math.sin(this.tempo * 0.12) * 1.4;
  }
}

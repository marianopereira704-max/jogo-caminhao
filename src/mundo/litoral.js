// Bioma LITORAL, inspirado na orla de Vitória-ES (Camburi, Praia do Canto, Enseada do Suá).
// Vista de cima: o mar fica a leste (+x) e o norte é +z.
//
//   x:  -240 ........ -112 rua interna -100 ... prédios ... 5 calçada 11 | avenida (dividida) 39 | ciclovia | calçadão 56 | areia | mar 82 →
//   z:  ruas transversais em -300, 0 e +300 (formam circuitos fechados); praça ao norte, shopping ao sul
import { criarCeu } from '../reflexo.js';
import * as T from './texturas-cidade.js';

const B = window.BABYLON;

// ---------- medidas do mapa (metros) ----------
export const L = {
  avSulX: [11, 21],        // pista sentido sul (lado dos prédios)
  canteiroX: [21, 29],
  avNorteX: [29, 39],      // pista sentido norte (lado da praia)
  calcadaOesteX: [5, 11],
  ciclovia: [39, 42],
  calcadaoX: [42, 56],
  areiaX: [56, 90],
  marX: 82,
  ruaInternaX: [-112, -100],
  transversaisZ: [-300, 0, 300],
  meiaRua: 6,
  zMin: -306, zMax: 306,
};

let semente = 777;
const rnd = () => { semente = (semente * 16807) % 2147483647; return (semente - 1) / 2147483646; };

function mat(scene, nome, cor, brilho = 0.05, emissivo = null) {
  const m = new B.StandardMaterial(nome, scene);
  m.diffuseColor = B.Color3.FromHexString(cor);
  m.specularColor = new B.Color3(brilho, brilho, brilho);
  if (emissivo) m.emissiveColor = B.Color3.FromHexString(emissivo);
  return m;
}

export class MundoLitoral {
  constructor(scene) {
    this.scene = scene;
    this.obstaculos = [];
    this.inicio = { x: 33.5, z: -220, angulo: 0 };
    this.tempo = 0;
    this.semaforos = [];

    this._ceuELuz(scene);
    this._chao(scene);
    this._ruas(scene);
    this._faixas(scene);
    this._calcadasEOrla(scene);
    this._predios(scene);
    this._comercio(scene);
    this._vegetacao(scene);
    this._postes(scene);
    this._semaforosEPlacas(scene);
    this._praca(scene);
    this._shopping(scene);
    this._fundo(scene);
  }

  // ======================= céu, luz e névoa =======================
  _ceuELuz(scene) {
    const horizonte = B.Color3.FromHexString('#d3e6f2');
    scene.clearColor = new B.Color4(horizonte.r, horizonte.g, horizonte.b, 1);
    this.ceu = criarCeu(scene, ['#d3e6f2', '#d3e6f2', '#d3e6f2', '#4f93d0']);
    this.ceu.scaling.setAll(4);
    scene.fogMode = B.Scene.FOGMODE_LINEAR;
    scene.fogColor = horizonte;
    scene.fogStart = 260;
    scene.fogEnd = 1500;

    const amb = new B.HemisphericLight('ambiente', new B.Vector3(0, 1, 0), scene);
    amb.intensity = 0.7;
    amb.groundColor = new B.Color3(0.38, 0.4, 0.36);
    this.sol = new B.DirectionalLight('sol', new B.Vector3(-0.45, -1, 0.35), scene);
    this.sol.intensity = 0.95;
    this.sol.autoUpdateExtends = true;
    this.sol.autoCalcShadowZBounds = true;
    this.sombras = new B.ShadowGenerator(1024, this.sol);
    this.sombras.usePercentageCloserFiltering = true;
    this.sombras.filteringQuality = B.ShadowGenerator.QUALITY_LOW;
    this.sombras.darkness = 0.35;
    this.sombras.bias = 0.002;
  }

  seguirSol(pos) { this.sol.position.set(pos.x + 25, 50, pos.z - 20); }

  // ======================= chão: grama, areia e mar =======================
  _chao(scene) {
    const plano = (nome, x0, x1, z0, z1, y, material, uv) => {
      const g = B.MeshBuilder.CreateGround(nome, { width: x1 - x0, height: z1 - z0 }, scene);
      g.position.set((x0 + x1) / 2, y, (z0 + z1) / 2);
      g.material = material;
      if (uv) { material.diffuseTexture.uScale = (x1 - x0) / uv; material.diffuseTexture.vScale = (z1 - z0) / uv; }
      g.receiveShadows = true;
      g.freezeWorldMatrix();
      return g;
    };
    const mGrama = mat(scene, 'grama', '#ffffff'); mGrama.diffuseTexture = T.texGrama(scene);
    this.chao = plano('chao', -1500, L.areiaX[0], -1500, 1500, 0, mGrama, 8);
    const mAreia = mat(scene, 'areia', '#ffffff'); mAreia.diffuseTexture = T.texAreia(scene);
    plano('areia', L.areiaX[0], L.areiaX[1] + 20, -1500, 1500, 0.01, mAreia, 6);
    mAreia.zOffset = -1;   // camadas de piso: quanto mais negativo, mais "por cima" (evita piscar de longe)
    this.mMar = mat(scene, 'mar', '#ffffff', 0.6);
    this.mMar.diffuseTexture = T.texMar(scene);
    this.mMar.specularPower = 64;
    this.mMar.zOffset = -2;
    this.mar = plano('mar', L.marX, 2600, -2600, 2600, 0.05, this.mMar, 40);
    // espuma na beira
    const mEspuma = mat(scene, 'espuma', '#f4f8fa', 0, '#9aa8ae');
    mEspuma.alpha = 0.75;
    mEspuma.zOffset = -3;
    plano('espuma', L.marX - 1, L.marX + 2, -1500, 1500, 0.06, mEspuma);
  }

  // ======================= ruas (asfalto) =======================
  _ruas(scene) {
    const mAsf = mat(scene, 'asfalto', '#ffffff', 0.08);
    mAsf.diffuseTexture = T.texAsfalto(scene);
    mAsf.zOffset = -2;
    const pedacos = [];
    const faixa = (x0, x1, z0, z1) => {
      const g = B.MeshBuilder.CreateGround('rua', { width: x1 - x0, height: z1 - z0 }, scene);
      g.position.set((x0 + x1) / 2, 0.02, (z0 + z1) / 2);
      // UV em metros (a textura repete a cada 12 m)
      const uv = g.getVerticesData(B.VertexBuffer.UVKind);
      for (let i = 0; i < uv.length; i += 2) { uv[i] *= (x1 - x0) / 12; uv[i + 1] *= (z1 - z0) / 12; }
      g.setVerticesData(B.VertexBuffer.UVKind, uv);
      pedacos.push(g);
    };
    const { zMin, zMax, meiaRua } = L;
    faixa(L.avSulX[0], L.avSulX[1], zMin, zMax);
    faixa(L.avNorteX[0], L.avNorteX[1], zMin, zMax);
    for (const z of L.transversaisZ) faixa(L.canteiroX[0], L.canteiroX[1], z - meiaRua, z + meiaRua);   // retornos
    faixa(L.ruaInternaX[0], L.ruaInternaX[1], zMin, zMax);
    for (const z of L.transversaisZ) faixa(L.ruaInternaX[0], L.avSulX[0], z - meiaRua, z + meiaRua);
    const ruas = B.Mesh.MergeMeshes(pedacos, true, true);
    ruas.material = mAsf;
    ruas.receiveShadows = true;
    ruas.freezeWorldMatrix();
  }

  // ======================= sinalização horizontal =======================
  _faixas(scene) {
    const mBranca = mat(scene, 'tinta-branca', '#f2f2ee', 0, '#3a3a38');
    const mAmarela = mat(scene, 'tinta-amarela', '#f2c230', 0, '#3a2e08');
    const mVermelha = mat(scene, 'tinta-vermelha', '#8c3f35', 0);
    for (const m of [mBranca, mAmarela, mVermelha]) m.zOffset = -4;
    const base = (m) => {
      const g = B.MeshBuilder.CreateGround('marca', { width: 1, height: 1 }, scene);
      g.material = m; g.isVisible = false; return g;
    };
    const bB = base(mBranca), bA = base(mAmarela), bV = base(mVermelha);
    let n = 0;
    const marca = (b, x, z, w, d) => {
      const i = b.createInstance('m' + n++);
      i.position.set(x, 0.035, z); i.scaling.set(w, 1, d); i.freezeWorldMatrix();
    };
    const pertoDeCruzamento = (z, folga) => L.transversaisZ.some((t) => Math.abs(z - t) < L.meiaRua + folga);
    // avenida: linha tracejada entre as 2 faixas de cada pista + bordas contínuas
    for (const [x0, x1] of [L.avSulX, L.avNorteX]) {
      const meio = (x0 + x1) / 2;
      for (let z = L.zMin + 2; z < L.zMax; z += 9) if (!pertoDeCruzamento(z, 14)) marca(bB, meio, z, 0.15, 3);
      for (const x of [x0 + 0.35, x1 - 0.35]) {
        for (let z = L.zMin; z < L.zMax; z += 10) if (!pertoDeCruzamento(z + 5, 9)) marca(bB, x, z + 5, 0.15, 10);
      }
    }
    // ciclovia vermelha com bordas brancas
    for (let z = L.zMin; z < L.zMax; z += 10) marca(bV, (L.ciclovia[0] + L.ciclovia[1]) / 2, z + 5, 3, 10);
    // rua interna e transversais: tracejado amarelo (mão dupla)
    const xi = (L.ruaInternaX[0] + L.ruaInternaX[1]) / 2;
    for (let z = L.zMin + 2; z < L.zMax; z += 9) if (!pertoDeCruzamento(z, 8)) marca(bA, xi, z, 0.15, 3);
    for (const zt of L.transversaisZ) for (let x = L.ruaInternaX[1] + 8; x < L.avSulX[0] - 8; x += 9) marca(bA, x, zt, 3, 0.15);
    // faixas de pedestre (zebradas) antes de cada cruzamento na avenida e na rua interna
    for (const zt of L.transversaisZ) {
      for (const lado of [-1, 1]) {
        const zf = zt + lado * (L.meiaRua + 4);
        for (const [x0, x1] of [L.avSulX, L.avNorteX, L.ruaInternaX]) {
          for (let x = x0 + 0.6; x < x1 - 0.4; x += 1.1) marca(bB, x + 0.25, zf, 0.55, 3.5);
        }
        // linha de retenção
        for (const [x0, x1] of [L.avSulX, L.avNorteX]) marca(bB, (x0 + x1) / 2, zt + lado * (L.meiaRua + 6.6), x1 - x0, 0.4);
      }
    }
  }

  // ======================= calçadas, canteiro, calçadão =======================
  _calcadasEOrla(scene) {
    const mCalc = mat(scene, 'calcada', '#ffffff', 0.04);
    mCalc.diffuseTexture = T.texCalcada(scene);
    const mCalcadao = mat(scene, 'calcadao', '#ffffff', 0.04);
    mCalcadao.diffuseTexture = T.texCalcadao(scene);
    const mGramaCant = mat(scene, 'grama-canteiro', '#ffffff');
    mGramaCant.diffuseTexture = T.texGrama(scene);
    const mMeioFio = mat(scene, 'meio-fio', '#e6e3dc', 0.05);
    for (const m of [mCalc, mCalcadao, mGramaCant]) m.zOffset = -2;

    const blocos = { calc: [], calcadao: [], cant: [], fio: [] };
    const piso = (lista, x0, x1, z0, z1, y = 0.03, uvM = 4) => {
      const g = B.MeshBuilder.CreateGround('piso', { width: x1 - x0, height: z1 - z0 }, scene);
      g.position.set((x0 + x1) / 2, y, (z0 + z1) / 2);
      const uv = g.getVerticesData(B.VertexBuffer.UVKind);
      for (let i = 0; i < uv.length; i += 2) { uv[i] *= (x1 - x0) / uvM; uv[i + 1] *= (z1 - z0) / uvM; }
      g.setVerticesData(B.VertexBuffer.UVKind, uv);
      lista.push(g);
    };
    const meioFio = (x0, x1, z0, z1) => {
      const b = B.MeshBuilder.CreateBox('fio', { width: x1 - x0, height: 0.18, depth: z1 - z0 }, scene);
      b.position.set((x0 + x1) / 2, 0.09, (z0 + z1) / 2);
      blocos.fio.push(b);
    };
    // trechos de z entre os cruzamentos
    const trechos = [];
    const zs = [L.zMin - 6, ...L.transversaisZ, L.zMax + 6];
    for (let i = 0; i < zs.length - 1; i++) trechos.push([zs[i] + L.meiaRua, zs[i + 1] - L.meiaRua]);
    for (const [z0, z1] of trechos) {
      if (z1 - z0 < 2) continue;
      piso(blocos.calc, L.calcadaOesteX[0], L.calcadaOesteX[1], z0, z1);                          // calçada dos prédios
      piso(blocos.cant, L.canteiroX[0] + 0.3, L.canteiroX[1] - 0.3, z0, z1, 0.12, 6);              // canteiro gramado
      meioFio(L.canteiroX[0], L.canteiroX[0] + 0.3, z0, z1);
      meioFio(L.canteiroX[1] - 0.3, L.canteiroX[1], z0, z1);
      meioFio(L.calcadaOesteX[1] - 0.25, L.calcadaOesteX[1], z0, z1);
      piso(blocos.calc, L.ruaInternaX[1], L.ruaInternaX[1] + 3, z0, z1);                           // calçadas da rua interna
      piso(blocos.calc, L.ruaInternaX[0] - 3, L.ruaInternaX[0], z0, z1);
      // obstáculo: o canteiro (só dá para atravessar nos retornos)
      this.obstaculos.push({ x: (L.canteiroX[0] + L.canteiroX[1]) / 2, z: (z0 + z1) / 2, mx: 2.6, mz: (z1 - z0) / 2 });
    }
    piso(blocos.calcadao, L.calcadaoX[0], L.calcadaoX[1], -1500, 1500, 0.03, 6);
    meioFio(L.ciclovia[1], L.ciclovia[1] + 0.25, -1500, 1500);

    for (const [lista, m, nome] of [[blocos.calc, mCalc, 'calcadas'], [blocos.calcadao, mCalcadao, 'calcadao'], [blocos.cant, mGramaCant, 'canteiros'], [blocos.fio, mMeioFio, 'meio-fio']]) {
      const u = B.Mesh.MergeMeshes(lista, true, true);
      u.name = nome; u.material = m; u.receiveShadows = true; u.freezeWorldMatrix();
    }
    // a praia começa depois do calçadão: limite para o caminhão não ir para a areia
    this.limiteLeste = L.calcadaoX[1] + 2;
  }

  // ======================= quarteirões: prédios misturados com casas =======================
  _predios(scene) {
    const mats = [0, 1, 2, 3].map((v) => {
      const m = mat(scene, 'fachada' + v, '#ffffff', 0.25);
      m.diffuseTexture = T.texFachada(scene, v);
      return m;
    });
    const mTopo = mat(scene, 'cobertura', '#b9bcc0', 0.05);
    const porMaterial = mats.map(() => []);
    const topos = [];
    this._casas = this._casas || { corpos: {}, telhados: [] };
    const predio = (x, z, larg, prof, alt, v) => {
      // UV por face: a textura (4 vãos x 4 andares ≈ 8 m x 12 m) repete pelo prédio
      const lado = (w) => new B.Vector4(0, 0, w / 8, alt / 12);
      const p = B.MeshBuilder.CreateBox('predio', {
        width: larg, height: alt, depth: prof,
        faceUV: [lado(larg), lado(larg), lado(prof), lado(prof), new B.Vector4(0, 0, 0, 0), new B.Vector4(0, 0, 0, 0)],
      }, scene);
      p.position.set(x, alt / 2, z);
      porMaterial[v].push(p);
      const t = B.MeshBuilder.CreateBox('topo', { width: larg - 1, height: 1.6, depth: prof - 1 }, scene);
      t.position.set(x, alt + 0.8, z);
      topos.push(t);
      this.obstaculos.push({ x, z, mx: larg / 2, mz: prof / 2 });
    };

    // frente para a avenida: sequência variada (torre, sobrados, prédio médio, espaço livre)
    const tipos = ['torre', 'casas', 'medio', 'torre', 'livre', 'casas', 'medio'];
    let k = 0;
    for (const [z0, z1] of [[-293, -7], [7, 293]]) {
      for (let z = z0 + 18; z < z1 - 14; z += 42) {
        const tipo = tipos[k++ % tipos.length];
        if (tipo === 'torre') predio(-14, z, 22, 24, 36 + Math.floor(rnd() * 8) * 3, Math.floor(rnd() * 4));
        else if (tipo === 'medio') predio(-15, z, 24, 22, 15 + Math.floor(rnd() * 3) * 3, Math.floor(rnd() * 4));
        else if (tipo === 'casas') { this._casa(scene, -12, z - 8, 0); this._casa(scene, -12, z + 8, 0); }
      }
      // fundo do quarteirão: mais casas, poucos prédios médios
      for (let z = z0 + 20; z < z1 - 14; z += 38) {
        if (rnd() < 0.3) predio(-66, z, 22, 22, 12 + Math.floor(rnd() * 3) * 3, Math.floor(rnd() * 4));
        else if (rnd() < 0.8) { this._casa(scene, -60, z - 7, Math.PI); this._casa(scene, -78, z + 6, Math.PI); }
      }
    }
    mats.forEach((m, i) => {
      if (!porMaterial[i].length) return;
      const u = B.Mesh.MergeMeshes(porMaterial[i], true, true);
      u.material = m; u.freezeWorldMatrix();
    });
    const t = B.Mesh.MergeMeshes(topos, true, true);
    t.material = mTopo; t.freezeWorldMatrix();
  }

  // casa térrea/sobrado com telhado de duas águas (juntadas por cor no fim)
  _casa(scene, x, z, giro = 0) {
    const cores = ['#f1e3c6', '#cfe3d3', '#f2d0c4', '#d6dff0', '#f5edb5'];
    const cor = cores[Math.floor(rnd() * cores.length)];
    const w = 10 + rnd() * 2, d = 11, h = rnd() < 0.5 ? 3.6 : 6.4;
    const c = B.MeshBuilder.CreateBox('casa', { width: w, height: h, depth: d }, scene);
    c.position.set(x, h / 2, z);
    (this._casas.corpos[cor] = this._casas.corpos[cor] || []).push(c);
    // telhado: triângulo extrudado ao longo da profundidade
    const beiral = 0.5;
    const forma = [new B.Vector3(-w / 2 - beiral, 0, 0), new B.Vector3(w / 2 + beiral, 0, 0), new B.Vector3(0, w * 0.32, 0), new B.Vector3(-w / 2 - beiral, 0, 0)];
    const caminho = [new B.Vector3(0, 0, -d / 2 - beiral), new B.Vector3(0, 0, d / 2 + beiral)];
    const t = B.MeshBuilder.ExtrudeShape('telhado', { shape: forma, path: caminho, cap: B.Mesh.CAP_ALL, sideOrientation: B.Mesh.DOUBLESIDE }, scene);
    t.position.set(x, h, z);
    t.rotation.y = giro;
    this._casas.telhados.push(t);
    this.obstaculos.push({ x, z, mx: w / 2, mz: d / 2 });
  }

  _juntarCasas(scene) {
    const { corpos, telhados } = this._casas;
    let n = 0;
    for (const [cor, lista] of Object.entries(corpos)) {
      const m = B.Mesh.MergeMeshes(lista, true, true); m.material = mat(scene, 'casa' + n++, cor, 0.05); m.freezeWorldMatrix();
    }
    if (telhados.length) {
      const tt = B.Mesh.MergeMeshes(telhados, true, true); tt.material = mat(scene, 'telha', '#b5523a', 0.05); tt.freezeWorldMatrix();
    }
  }

  // ======================= comércio (rua interna) =======================
  _comercio(scene) {
    const lojas = [
      ['Padaria Pão Quente', '#f2c48d'], ['Açaí da Orla', '#8a55c4'], ['Farmácia Bem Viver', '#3aa66b'],
      ['Mercado Bom Preço', '#e2574c'], ['Loja do Rael', '#ffd23a', T.desenhosRael], ['Sorveteria Mar Gelado', '#8fd3f0'],
      ['Pet Shop Au Au', '#f39b3d'], ['Pizzaria Bella', '#c94b3a'],
    ];
    const frente = L.ruaInternaX[0] - 3;      // calçada oeste da rua interna
    const larg = 18, alt = 8, prof = 14;
    let i = 0;
    for (const [z0, z1] of [[-293, -7], [7, 293]]) {
      for (let z = z0 + 24; z < z1 - 12 && i < lojas.length; z += larg + 16) {
        const [nome, cor, extra] = lojas[i];
        i++;
        const x = frente - prof / 2;
        // prédio pequeno pintado na cor da loja (todos os lados)
        const caixa = B.MeshBuilder.CreateBox('loja', { width: prof, height: alt, depth: larg }, scene);
        caixa.position.set(x, alt / 2, z);
        caixa.material = mat(scene, 'parede-' + nome, cor, 0.05);
        caixa.freezeWorldMatrix();
        const telhado = B.MeshBuilder.CreateBox('platibanda', { width: prof + 0.4, height: 0.6, depth: larg + 0.4 }, scene);
        telhado.position.set(x, alt + 0.3, z);
        telhado.material = mat(scene, 'plat-' + nome, '#e8e4dc', 0.05);
        const m = mat(scene, 'loja-' + nome, '#ffffff', 0.1);
        m.diffuseTexture = T.texLoja(scene, nome, cor, extra);
        const f = B.MeshBuilder.CreatePlane('fachada-loja', { width: larg - 0.4, height: alt - 0.4 }, scene);
        f.position.set(frente + 0.06, alt / 2, z);
        f.rotation.y = -Math.PI / 2;
        f.material = m;
        f.freezeWorldMatrix();
        const toldo = B.MeshBuilder.CreateBox('toldo', { width: 1.6, height: 0.12, depth: larg - 2 }, scene);
        toldo.position.set(frente + 0.75, 3.4, z); toldo.rotation.z = -0.25;
        toldo.material = mat(scene, 'toldo' + i, cor, 0.1);
        toldo.freezeWorldMatrix();
      }
    }
    // casas espalhadas atrás das lojas (só cenário: o caminhão não passa para lá)
    for (let z = -280; z < 290; z += 30 + rnd() * 10) {
      if (L.transversaisZ.some((t) => Math.abs(z - t) < 12)) continue;
      if (rnd() < 0.75) this._casa(scene, -150 - rnd() * 8, z, 0);
    }
    this._juntarCasas(scene);
  }

  // ======================= árvores =======================
  _vegetacao(scene) {
    const mTronco = mat(scene, 'tronco', '#7a5a3c');
    const mFolha = mat(scene, 'folha', '#3f7f35', 0.05);
    const mFolha2 = mat(scene, 'folha2', '#4f9440', 0.05);
    const mPalha = mat(scene, 'coqueiro-folha', '#5f9a3a', 0.05);
    mPalha.backFaceCulling = false;
    const mCoqueiroTronco = mat(scene, 'coqueiro-tronco', '#9a8468');

    // amendoeira: copa larga e achatada em camadas
    const partesA = [];
    const tr = B.MeshBuilder.CreateCylinder('t', { diameterTop: 0.35, diameterBottom: 0.55, height: 4, tessellation: 8 }, scene);
    tr.position.y = 2; tr.material = mTronco; partesA.push(tr);
    [[0, 4.4, 0, 7, 1.6, mFolha], [0.6, 5.4, -0.4, 5.4, 1.4, mFolha2], [-0.5, 6.2, 0.3, 3.8, 1.2, mFolha]].forEach(([x, y, z, d, h, m]) => {
      const c = B.MeshBuilder.CreateSphere('c', { diameter: 1, segments: 6 }, scene);
      c.scaling.set(d, h, d); c.position.set(x, y, z); c.material = m; partesA.push(c);
    });
    const amendoeira = B.Mesh.MergeMeshes(partesA, true, true, undefined, false, true);
    amendoeira.isVisible = false;

    // coqueiro: tronco curvado + folhas caídas
    const partesC = [];
    const caminho = [];
    for (let i = 0; i <= 8; i++) { const t = i / 8; caminho.push(new B.Vector3(Math.sin(t * 1.2) * 0.9, t * 8, 0)); }
    const tronco = B.MeshBuilder.CreateTube('t', { path: caminho, radiusFunction: (i) => 0.26 - i * 0.012, tessellation: 7 }, scene);
    tronco.material = mCoqueiroTronco; partesC.push(tronco);
    const topo = caminho[caminho.length - 1];
    for (let i = 0; i < 9; i++) {
      const folha = B.MeshBuilder.CreateBox('f', { width: 3.6, height: 0.04, depth: 0.7 }, scene);
      folha.setPivotPoint(new B.Vector3(-1.8, 0, 0));
      folha.position.set(topo.x + 1.8, topo.y, topo.z);
      folha.rotation.set(0, (i / 9) * Math.PI * 2, -0.55 - (i % 2) * 0.25);
      folha.material = mPalha;
      partesC.push(folha);
    }
    const coco = B.MeshBuilder.CreateSphere('coco', { diameter: 0.7, segments: 4 }, scene);
    coco.position.set(topo.x, topo.y - 0.3, topo.z); coco.material = mTronco; partesC.push(coco);
    const coqueiro = B.MeshBuilder.CreateBox('vazio', { size: 0.01 }, scene);
    const coqueiroM = B.Mesh.MergeMeshes(partesC, true, true, undefined, false, true);
    coqueiroM.isVisible = false;
    coqueiro.dispose();

    let n = 0;
    const plantar = (base, x, z, esc, raio) => {
      const a = base.createInstance('arv' + n++);
      a.position.set(x, 0, z); a.rotation.y = rnd() * 6.28; a.scaling.setAll(esc);
      a.freezeWorldMatrix();
      if (raio) this.obstaculos.push({ x, z, r: raio });
    };
    const longeDeCruzamento = (z) => L.transversaisZ.every((t) => Math.abs(z - t) > 14);
    // canteiro central: amendoeiras
    for (let z = L.zMin + 10; z < L.zMax - 5; z += 44) if (longeDeCruzamento(z)) plantar(amendoeira, 25, z + rnd() * 4, 0.9 + rnd() * 0.3, 0.5);
    // calçadão: coqueiros e algumas amendoeiras
    for (let z = -700; z < 700; z += 30) plantar(coqueiroM, 53 + rnd() * 2, z + rnd() * 6, 0.9 + rnd() * 0.35, 0.4);
    for (let z = -690; z < 700; z += 96) plantar(amendoeira, 45.5, z, 0.85, 0.5);
    // areia: coqueiros soltos
    for (let z = -900; z < 900; z += 75) plantar(coqueiroM, 60 + rnd() * 14, z + rnd() * 10, 0.8 + rnd() * 0.4);
    // calçada dos prédios e rua interna
    for (let z = L.zMin + 8; z < L.zMax; z += 56) if (longeDeCruzamento(z)) plantar(amendoeira, 7.5, z, 0.75, 0.45);
    for (let z = L.zMin + 14; z < L.zMax; z += 68) if (longeDeCruzamento(z)) plantar(amendoeira, L.ruaInternaX[1] + 1.8, z, 0.7, 0.45);
  }

  // ======================= postes de luz =======================
  _postes(scene) {
    const mPoste = mat(scene, 'poste', '#8b9096', 0.3);
    const mLuz = mat(scene, 'luminaria', '#f5f1e0', 0.3, '#3a382f');
    this.mLuzPoste = mLuz;
    const partes = [];
    const haste = B.MeshBuilder.CreateCylinder('h', { diameterTop: 0.14, diameterBottom: 0.26, height: 10, tessellation: 8 }, scene);
    haste.position.y = 5; haste.material = mPoste; partes.push(haste);
    for (const s of [-1, 1]) {
      const braco = B.MeshBuilder.CreateBox('b', { width: 2.4, height: 0.1, depth: 0.1 }, scene);
      braco.position.set(s * 1.2, 9.8, 0); braco.material = mPoste; partes.push(braco);
      const cab = B.MeshBuilder.CreateBox('l', { width: 0.9, height: 0.16, depth: 0.4 }, scene);
      cab.position.set(s * 2.3, 9.75, 0); cab.material = mLuz; partes.push(cab);
    }
    const posteDuplo = B.Mesh.MergeMeshes(partes, true, true, undefined, false, true);
    posteDuplo.isVisible = false;
    let n = 0;
    const longeDeCruzamento = (z) => L.transversaisZ.every((t) => Math.abs(z - t) > 12);
    for (let z = L.zMin + 21; z < L.zMax; z += 22) {
      if (!longeDeCruzamento(z)) continue;
      const p = posteDuplo.createInstance('poste' + n++); p.position.set(25, 0, z); p.freezeWorldMatrix();
    }
    for (let z = -700; z < 700; z += 32) {
      const p = posteDuplo.createInstance('poste' + n++); p.position.set(48.5, 0, z); p.rotation.y = Math.PI / 2; p.scaling.setAll(0.85); p.freezeWorldMatrix();
      this.obstaculos.push({ x: 48.5, z, r: 0.3 });
    }
  }

  // ======================= semáforos de braço e placas =======================
  _semaforosEPlacas(scene) {
    const mPoste = mat(scene, 'semaforo-poste', '#2d3035', 0.2);
    this.luzes = {
      vermelho: mat(scene, 'sem-vermelho', '#4a0b0b', 0.5),
      amarelo: mat(scene, 'sem-amarelo', '#4a3a0b', 0.5),
      verde: mat(scene, 'sem-verde', '#0b3a18', 0.5),
    };
    const semaforo = (x, z, comprimento, lado, olhaPara) => {
      // lado: -1 braço para -x, +1 braço para +x; olhaPara: +1 luzes viradas para +z, -1 para -z
      const pai = new B.TransformNode('semaforo', scene);
      pai.position.set(x, 0, z);
      const haste = B.MeshBuilder.CreateCylinder('sh', { diameter: 0.28, height: 6.6, tessellation: 10 }, scene);
      haste.position.y = 3.3; haste.material = mPoste; haste.parent = pai;
      const braco = B.MeshBuilder.CreateCylinder('sb', { diameter: 0.18, height: comprimento, tessellation: 8 }, scene);
      braco.rotation.z = Math.PI / 2; braco.position.set(lado * comprimento / 2, 6.4, 0); braco.material = mPoste; braco.parent = pai;
      for (const px of [lado * comprimento * 0.55, lado * comprimento * 0.95]) {
        const caixa = B.MeshBuilder.CreateBox('sc', { width: 0.45, height: 1.3, depth: 0.4 }, scene);
        caixa.position.set(px, 5.7, 0); caixa.material = mPoste; caixa.parent = pai;
        [['vermelho', 6.1], ['amarelo', 5.7], ['verde', 5.3]].forEach(([cor, y]) => {
          const l = B.MeshBuilder.CreateCylinder('sl', { diameter: 0.3, height: 0.06, tessellation: 14 }, scene);
          l.rotation.x = Math.PI / 2; l.position.set(px, y, olhaPara * 0.21); l.material = this.luzes[cor]; l.parent = pai;
        });
      }
      this.obstaculos.push({ x, z, r: 0.35 });
    };
    for (const zt of L.transversaisZ) {
      // pista sentido sul: carros vêm de +z, o semáforo fica antes do cruzamento (z maior) olhando para +z
      semaforo(L.calcadaOesteX[0] + 2.5, zt + L.meiaRua + 8, 10, 1, 1);
      // pista sentido norte: vêm de -z, semáforo na calçada da praia olhando para -z
      semaforo(L.ciclovia[1] + 1.2, zt - L.meiaRua - 8, 11, -1, -1);
    }

    // placas
    const placa = (textura, x, z, giro, larg = 0.9, alt = 0.9, h = 2.4) => {
      const m = mat(scene, 'placa-' + x + '-' + z, '#ffffff', 0.1);
      m.diffuseTexture = textura; m.useAlphaFromDiffuseTexture = true; m.backFaceCulling = false;
      const p = B.MeshBuilder.CreatePlane('placa', { width: larg, height: alt }, scene);
      p.position.set(x, h, z); p.rotation.y = giro; p.material = m;
      const poste = B.MeshBuilder.CreateCylinder('pp', { diameter: 0.08, height: h, tessellation: 6 }, scene);
      poste.position.set(x, h / 2 - 0.2, z + 0.05); poste.material = mPoste;
      this.obstaculos.push({ x, z, r: 0.25 });
    };
    const pare = T.texPlacaPare(scene);
    const vel = T.texPlacaVelocidade(scene, 40);
    const ped = T.texPlacaPedestre(scene);
    for (const zt of L.transversaisZ) {
      // PARE nas transversais antes de entrar na avenida
      placa(pare, L.calcadaOesteX[0] + 1, zt - L.meiaRua - 1.2, -Math.PI / 2);
      // placa azul com o nome da avenida e do bairro
      const nomes = { '-300': 'Enseada do Suá', '0': 'Jardim Camburi', '300': 'Praia do Canto' };
      placa(T.texPlacaRua(scene, 'Av. Dante Michelini'), L.calcadaOesteX[0] + 1.5, zt + L.meiaRua + 1.5, Math.PI, 3.2, 0.8, 3.2);
      placa(T.texPlacaRua(scene, nomes[String(zt)]), L.ruaInternaX[1] + 1.5, zt + L.meiaRua + 1.5, Math.PI, 3.2, 0.8, 3.2);
      placa(ped, L.ciclovia[1] + 1.2, zt - L.meiaRua - 22, Math.PI);
    }
    for (const z of [-150, 150]) placa(vel, L.ciclovia[1] + 1.2, z, Math.PI);
    for (const z of [-160, 140]) placa(vel, L.calcadaOesteX[0] + 1, z, 0);
  }

  // ciclo do semáforo (só enfeite: ninguém precisa respeitar)
  _cicloSemaforo() {
    const t = this.tempo % 14;
    const fase = t < 6 ? 'verde' : t < 8 ? 'amarelo' : 'vermelho';
    const acesa = { vermelho: '#ff2a1e', amarelo: '#ffb81a', verde: '#2bff6a' };
    const apagada = { vermelho: '#3a0b0b', amarelo: '#3a2e0b', verde: '#0b2e14' };
    for (const cor of ['vermelho', 'amarelo', 'verde']) {
      this.luzes[cor].emissiveColor = B.Color3.FromHexString(cor === fase ? acesa[cor] : apagada[cor]);
    }
  }

  // ======================= praça (norte) e marina =======================
  _praca(scene) {
    const mPiso = mat(scene, 'praca-piso', '#ffffff', 0.04);
    mPiso.diffuseTexture = T.texCalcadao(scene);
    const g = B.MeshBuilder.CreateGround('praca', { width: 110, height: 60 }, scene);
    g.position.set(-50, 0.03, 340); g.material = mPiso; g.receiveShadows = true; g.freezeWorldMatrix();
    // quadras de areia (vôlei)
    const mAreia = mat(scene, 'quadra-areia', '#e7d4a2');
    const mRede = mat(scene, 'rede', '#f4f4f4', 0.1);
    for (const x of [-70, -40]) {
      const q = B.MeshBuilder.CreateGround('quadra', { width: 16, height: 26 }, scene);
      q.position.set(x, 0.05, 345); q.material = mAreia;
      const rede = B.MeshBuilder.CreateBox('rede', { width: 10, height: 1, depth: 0.05 }, scene);
      rede.position.set(x, 2.2, 345); rede.material = mRede;
      for (const s of [-1, 1]) { const p = B.MeshBuilder.CreateCylinder('pr', { diameter: 0.12, height: 2.7 }, scene); p.position.set(x + s * 5.2, 1.35, 345); p.material = mRede; }
      this.obstaculos.push({ x, z: 345, mx: 5.5, mz: 0.5 });
    }
    // píer da marina com veleiros
    const mMadeira = mat(scene, 'pier', '#8a6a4a');
    const pier = B.MeshBuilder.CreateBox('pier', { width: 70, height: 0.4, depth: 4 }, scene);
    pier.position.set(L.marX + 30, 0.6, 345); pier.material = mMadeira;
    const mCasco = mat(scene, 'casco', '#f4f4f4', 0.4);
    const mVela = mat(scene, 'vela', '#ffffff', 0.1); mVela.backFaceCulling = false;
    for (let i = 0; i < 7; i++) {
      const x = L.marX + 18 + i * 10, z = 345 + (i % 2 ? 9 : -9);
      const casco = B.MeshBuilder.CreateBox('casco', { width: 2.4, height: 0.9, depth: 7 }, scene);
      casco.position.set(x, 0.4, z); casco.material = mCasco;
      const mastro = B.MeshBuilder.CreateCylinder('mastro', { diameter: 0.12, height: 9 }, scene);
      mastro.position.set(x, 5, z); mastro.material = mCasco;
    }
  }

  // ======================= shopping (sul) =======================
  _shopping(scene) {
    const mShop = mat(scene, 'shopping', '#eceae6', 0.1);
    const mVidro = mat(scene, 'shopping-vidro', '#6d8fa6', 0.6);
    const corpo = B.MeshBuilder.CreateBox('shopping', { width: 90, height: 16, depth: 50 }, scene);
    corpo.position.set(-45, 8, -345); corpo.material = mShop;
    const vidro = B.MeshBuilder.CreateBox('shop-vidro', { width: 40, height: 10, depth: 0.4 }, scene);
    vidro.position.set(-45, 7, -319.8); vidro.material = mVidro;
    const mLetreiro = mat(scene, 'shop-letreiro', '#ffffff', 0.1);
    mLetreiro.diffuseTexture = T.texPlacaRua(scene, 'Shopping da Orla');
    const letreiro = B.MeshBuilder.CreatePlane('shop-placa', { width: 20, height: 5 }, scene);
    letreiro.position.set(-45, 13.5, -319.7); letreiro.rotation.y = Math.PI; letreiro.material = mLetreiro;
    this.obstaculos.push({ x: -45, z: -345, mx: 45, mz: 25 });
    // pontos de ônibus cobertos na calçada dos prédios
    const mAbrigo = mat(scene, 'abrigo', '#dfe3e6', 0.3);
    for (const z of [-150, 150]) {
      const tetinho = B.MeshBuilder.CreateBox('abrigo', { width: 2.6, height: 0.12, depth: 12 }, scene);
      tetinho.position.set(7.5, 2.8, z); tetinho.material = mAbrigo;
      for (const dz of [-5.5, 5.5]) { const c = B.MeshBuilder.CreateCylinder('ac', { diameter: 0.12, height: 2.8 }, scene); c.position.set(6.6, 1.4, z + dz); c.material = mAbrigo; }
      this.obstaculos.push({ x: 7.5, z, mx: 1.3, mz: 6 });
    }
    // quiosques no calçadão
    const mQuiosque = mat(scene, 'quiosque', '#f2efe8', 0.1);
    const mTeto = mat(scene, 'quiosque-teto', '#c96a2b', 0.1);
    for (let z = -260; z <= 260; z += 104) {
      const q = B.MeshBuilder.CreateCylinder('quiosque', { diameter: 5, height: 3, tessellation: 6 }, scene);
      q.position.set(51, 1.5, z); q.material = mQuiosque;
      const t = B.MeshBuilder.CreateCylinder('quiosque-teto', { diameterTop: 0.2, diameterBottom: 7, height: 1.8, tessellation: 6 }, scene);
      t.position.set(51, 3.9, z); t.material = mTeto;
      this.obstaculos.push({ x: 51, z, r: 2.8 });
    }
  }

  // ======================= fundo: morros, convento, ponte, ilha =======================
  _fundo(scene) {
    const mMorro = mat(scene, 'morro', '#5f7f4c');
    const mPedra = mat(scene, 'pedra', '#8d8a80');
    const morro = (x, z, larg, alt, m = mMorro) => {
      const s = B.MeshBuilder.CreateSphere('morro', { diameter: 1, segments: 8 }, scene);
      s.scaling.set(larg, alt * 2, larg * 0.8); s.position.set(x, 0, z); s.material = m; s.freezeWorldMatrix();
      return s;
    };
    // morros a oeste e ao norte (Mestre Álvaro ao norte, o maior)
    morro(-700, 200, 500, 140); morro(-650, -350, 420, 110); morro(-200, 1300, 900, 260);
    morro(-900, -800, 600, 160);
    // morro do Convento da Penha ao sul, com o convento no alto
    morro(250, -1150, 260, 120, mPedra);
    const mConv = mat(scene, 'convento', '#f4f2ec', 0.1);
    const conv = B.MeshBuilder.CreateBox('convento', { width: 26, height: 14, depth: 16 }, scene);
    conv.position.set(250, 124, -1150); conv.material = mConv;
    const torre = B.MeshBuilder.CreateBox('torre', { width: 7, height: 22, depth: 7 }, scene);
    torre.position.set(262, 131, -1150); torre.material = mConv;
    // Terceira Ponte: arco longo sobre o mar ao sul
    const mPonte = mat(scene, 'ponte', '#d8d5ce', 0.05);
    const pts = [];
    for (let i = 0; i <= 20; i++) { const t = i / 20; pts.push(new B.Vector3(-150 + t * 1100, 8 + Math.sin(t * Math.PI) * 70, -900 + t * 80)); }
    const tabuleiro = B.MeshBuilder.CreateTube('ponte', { path: pts, radius: 4, tessellation: 4 }, scene);
    tabuleiro.material = mPonte;
    for (let i = 2; i < 20; i += 2) {
      const p = pts[i];
      const pilar = B.MeshBuilder.CreateBox('pilar', { width: 5, height: p.y, depth: 5 }, scene);
      pilar.position.set(p.x, p.y / 2, p.z); pilar.material = mPonte;
    }
    // Ilha do Socó: ilhota com vegetação
    morro(230, 40, 60, 14, mMorro);
  }

  atualizar(dt) {
    this.tempo += dt;
    this.mMar.diffuseTexture.uOffset += dt * 0.004;
    this.mMar.diffuseTexture.vOffset += dt * 0.0015;
    this._cicloSemaforo();
  }

  // Algum ponto do caminhão encostou em algo?
  bateu(pontos, raio) {
    for (const p of pontos) {
      if (p.x > this.limiteLeste || p.x < L.ruaInternaX[0] - 3 || p.z > 372 || p.z < -372) return true;
      for (const o of this.obstaculos) {
        if (o.r !== undefined) {
          const dx = p.x - o.x, dz = p.z - o.z, d = o.r + raio;
          if (dx * dx + dz * dz < d * d) return true;
        } else if (Math.abs(p.x - o.x) < o.mx + raio && Math.abs(p.z - o.z) < o.mz + raio) {
          return true;
        }
      }
    }
    return false;
  }
}

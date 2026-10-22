// Bioma LITORAL, inspirado na orla de Vitória-ES (Camburi, Praia do Canto, Enseada do Suá).
// Vista de cima: o mar fica a leste (+x) e o norte é +z.
//
//  x: lojas -61..-47 | calçada | rua interna -44..-34 | calçada | quarteirão de prédios -30..4 |
//     calçada 4..11 | avenida (2 pistas + canteiro) 11..39 | ciclovia 39..42 | calçadão 42..54 | areia 54..72 | mar
//  z: ruas transversais em -300, 0 e +300 (formam circuitos fechados); praça ao norte, shopping ao sul
//
// Texturas reais (CC0) do Poly Haven em assets/texturas; céu HDRI (CC0) em assets/ceu.
import * as T from './texturas-cidade.js';

const B = window.BABYLON;

export const L = {
  avSulX: [11, 21],
  canteiroX: [21, 29],
  avNorteX: [29, 39],
  calcadaOesteX: [4, 11],
  ciclovia: [39, 42],
  calcadaoX: [42, 54],
  areiaX: [54, 72],
  marX: 72,
  quarteiraoX: [-30, 4],
  ruaInternaX: [-44, -34],
  frenteLojasX: -47,
  transversaisZ: [-300, 0, 300],
  meiaRua: 6,
  zMin: -306, zMax: 306,
};

let semente = 2024;
const rnd = () => { semente = (semente * 16807) % 2147483647; return (semente - 1) / 2147483646; };

export class MundoLitoral {
  constructor(scene) {
    this.scene = scene;
    this.obstaculos = [];
    this.inicio = { x: 33.5, z: -220, angulo: 0 };
    this.tempo = 0;
    this.casters = [];

    this._ceuELuz(scene);
    this._materiais(scene);
    this._chao(scene);
    this._ruas(scene);
    this._faixas(scene);
    this._calcadas(scene);
    this._predios(scene);
    this._comercio(scene);
    this._vegetacao(scene);
    this._postes(scene);
    this._semaforosEPlacas(scene);
    this._praca(scene);
    this._shopping(scene);
    this._fundo(scene);
    for (const c of this.casters) this.sombras.addShadowCaster(c);
  }

  // ======================= céu HDRI, luz, cor de câmera =======================
  _ceuELuz(scene) {
    this.env = B.CubeTexture.CreateFromPrefilteredData('assets/ceu/ceu.env', scene);
    scene.environmentTexture = this.env;
    const sky = scene.createDefaultSkybox(this.env, false, 2600);
    sky.material.fogEnabled = false;
    sky.infiniteDistance = true;
    this.ceu = sky;

    const horizonte = B.Color3.FromHexString('#c9dbe8');
    scene.clearColor = new B.Color4(horizonte.r, horizonte.g, horizonte.b, 1);
    scene.fogMode = B.Scene.FOGMODE_LINEAR;
    scene.fogColor = horizonte;
    scene.fogStart = 220;
    scene.fogEnd = 1300;

    // tratamento de cor como câmera de verdade (tira o aspecto "chapado")
    const ip = scene.imageProcessingConfiguration;
    ip.toneMappingEnabled = true;
    ip.toneMappingType = B.ImageProcessingConfiguration.TONEMAPPING_ACES;
    ip.exposure = 1.25;
    ip.contrast = 1.18;

    const amb = new B.HemisphericLight('ambiente', new B.Vector3(0, 1, 0), scene);
    amb.intensity = 0.62;
    amb.diffuse = new B.Color3(0.86, 0.92, 1.0);
    amb.groundColor = new B.Color3(0.42, 0.4, 0.36);
    amb.specular = B.Color3.Black();

    // sol de manhã, mais baixo: sombras longas dos prédios e árvores
    this.sol = new B.DirectionalLight('sol', new B.Vector3(-0.55, -0.75, 0.38).normalize(), scene);
    this.sol.intensity = 1.25;
    this.sol.diffuse = new B.Color3(1, 0.95, 0.86);
    this.sol.autoUpdateExtends = false;
    this.sol.orthoLeft = -75; this.sol.orthoRight = 75;
    this.sol.orthoTop = 75; this.sol.orthoBottom = -75;
    this.sol.shadowMinZ = 1; this.sol.shadowMaxZ = 420;
    this.sombras = new B.ShadowGenerator(2048, this.sol);
    this.sombras.usePercentageCloserFiltering = true;
    this.sombras.filteringQuality = B.ShadowGenerator.QUALITY_MEDIUM;
    this.sombras.darkness = 0.32;
    this.sombras.bias = 0.0015;
    this.sombras.normalBias = 0.02;
  }

  seguirSol(pos) {
    const d = this.sol.direction;
    this.sol.position.set(pos.x - d.x * 200, pos.y - d.y * 200, pos.z - d.z * 200);
  }

  // ======================= materiais com texturas reais =======================
  _materiais(scene) {
    const tx = (nome, mapa) => {
      const t = new B.Texture(`assets/texturas/${nome}_${mapa}.jpg`, scene);
      t.anisotropicFilteringLevel = 8;
      return t;
    };
    const real = (nome, arquivo, cor, opcoes = {}) => {
      const m = new B.StandardMaterial(nome, scene);
      m.diffuseTexture = tx(arquivo, 'diff');
      m.bumpTexture = tx(arquivo, 'nor');
      m.bumpTexture.level = opcoes.relevo ?? 0.8;
      m.invertNormalMapX = true;   // mapas "GL" do Poly Haven no sistema de coordenadas do Babylon
      m.diffuseColor = B.Color3.FromHexString(cor).scale(opcoes.luz ?? 1);
      m.specularColor = new B.Color3(opcoes.brilho ?? 0.04, opcoes.brilho ?? 0.04, opcoes.brilho ?? 0.04);
      m.zOffset = opcoes.z ?? 0;
      return m;
    };
    const cor = (nome, hex, brilho = 0.05, emissivo = null) => {
      const m = new B.StandardMaterial(nome, scene);
      m.diffuseColor = B.Color3.FromHexString(hex);
      m.specularColor = new B.Color3(brilho, brilho, brilho);
      if (emissivo) m.emissiveColor = B.Color3.FromHexString(emissivo);
      return m;
    };
    const reflexo = (m, borda, frente) => {
      m.reflectionTexture = this.env;
      const f = new B.FresnelParameters();
      f.bias = 0.05; f.power = 2.4;
      f.leftColor = new B.Color3(borda, borda, borda);
      f.rightColor = new B.Color3(frente, frente, frente);
      m.reflectionFresnelParameters = f;
      return m;
    };
    this.M = {
      asfalto: real('asfalto', 'asphalt_02', '#ffffff', { relevo: 0.6, brilho: 0.06, z: -2 }),
      calcada: real('calcada', 'concrete_pavement', '#ffffff', { relevo: 0.7, z: -2 }),
      calcadao: real('calcadao', 'concrete_pavement', '#fff8ec', { relevo: 0.5, z: -2, luz: 1.12 }),
      lote: real('lote', 'concrete_pavement', '#c9c6c0', { relevo: 0.5, z: 0 }),
      grama: real('grama', 'grass_ground', '#ffffff', { relevo: 0.9, z: -2 }),
      areia: real('areia', 'aerial_sand', '#ffffff', { relevo: 0.6, z: -1 }),
      meioFio: cor('meio-fio', '#d9d6cf'),
      tintaBranca: cor('tinta-branca', '#eeeeea', 0.1),
      tintaAmarela: cor('tinta-amarela', '#e8b72a', 0.1),
      ciclovia: cor('ciclovia', '#8a3b31', 0.05),
      vidro: reflexo(cor('vidro', '#1f2d38', 0.9), 0.95, 0.28),
      guarda: reflexo(cor('guarda-corpo', '#7fa3b6', 0.8), 0.9, 0.2),
      caixilho: cor('caixilho', '#3b4046', 0.4),
      paredes: ['#ece8e1', '#dfe4e8', '#efe4d3', '#d8d2c8'].map((h, i) => cor('parede' + i, h, 0.06)),
      muro: cor('muro', '#d9d1c2', 0.03),
      metal: cor('metal', '#8b9096', 0.5),
      metalEscuro: cor('metal-escuro', '#2d3035', 0.3),
    };
    for (const m of [this.M.tintaBranca, this.M.tintaAmarela, this.M.ciclovia]) m.zOffset = -4;
    this.M.guarda.alpha = 0.55;
    this.M.vidro.specularPower = 128;
  }

  // ======================= chão: calçamento, areia e mar =======================
  // cria um piso com UV em metros (a textura repete a cada "tile" metros)
  _piso(nome, x0, x1, z0, z1, y, tile) {
    const g = B.MeshBuilder.CreateGround(nome, { width: x1 - x0, height: z1 - z0 }, this.scene);
    g.position.set((x0 + x1) / 2, y, (z0 + z1) / 2);
    const uv = g.getVerticesData(B.VertexBuffer.UVKind);
    for (let i = 0; i < uv.length; i += 2) { uv[i] *= (x1 - x0) / tile; uv[i + 1] *= (z1 - z0) / tile; }
    g.setVerticesData(B.VertexBuffer.UVKind, uv);
    g.receiveShadows = true;
    return g;
  }

  _juntar(lista, material, nome) {
    if (!lista.length) return null;
    const m = B.Mesh.MergeMeshes(lista, true, true, undefined, false, false);
    m.name = nome; m.material = material; m.receiveShadows = true; m.freezeWorldMatrix();
    return m;
  }

  _chao(scene) {
    const { M } = this;
    // quarteirões e entorno: calçamento urbano (sem gramado gigante)
    this.chao = this._juntar([this._piso('lote', -900, L.calcadaoX[0], -900, 900, 0, 6)], M.lote, 'chao');
    this._juntar([this._piso('areia', L.areiaX[0], L.areiaX[1] + 30, -1500, 1500, 0.01, 7)], M.areia, 'areia');

    // mar: azul-esverdeado, ondulação (relevo procedural) e reflexo do céu
    const mar = new B.StandardMaterial('mar', scene);
    mar.diffuseColor = B.Color3.FromHexString('#2a6f86');
    mar.specularColor = new B.Color3(0.45, 0.45, 0.45);
    mar.specularPower = 96;
    mar.bumpTexture = this._texturaOndas(scene);
    mar.bumpTexture.level = 0.45;
    mar.reflectionTexture = this.env;
    const f = new B.FresnelParameters(); f.bias = 0.1; f.power = 2;
    f.leftColor = new B.Color3(0.42, 0.45, 0.48); f.rightColor = new B.Color3(0.04, 0.05, 0.06);
    mar.reflectionFresnelParameters = f;
    mar.zOffset = -2;
    this.mMar = mar;
    const agua = this._piso('mar', L.marX, 2600, -2600, 2600, 0.05, 14);
    agua.material = mar; agua.freezeWorldMatrix();
    // espuma na beira
    const espuma = new B.StandardMaterial('espuma', scene);
    espuma.diffuseColor = B.Color3.FromHexString('#f4f8fa');
    espuma.emissiveColor = B.Color3.FromHexString('#8a969b');
    espuma.alpha = 0.7; espuma.zOffset = -3;
    const e = this._piso('espuma', L.marX - 0.8, L.marX + 1.6, -1500, 1500, 0.06, 4);
    e.material = espuma; e.freezeWorldMatrix();
  }

  // mapa de relevo do mar: soma de ondas que se repetem sem emenda
  _texturaOndas(scene) {
    const N = 256;
    const t = new B.DynamicTexture('ondas', { width: N, height: N }, scene, true);
    const c = t.getContext();
    const img = c.createImageData(N, N);
    const ondas = [[3, 1, 0.5], [1, 4, 1.7], [5, 3, 2.9], [7, -2, 0.3], [2, -6, 4.1], [9, 5, 1.1]];
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        let dx = 0, dy = 0;
        for (const [a, b, fase] of ondas) {
          const k = (2 * Math.PI) / N;
          const v = Math.cos(k * (a * x + b * y) + fase) / Math.hypot(a, b);
          dx += v * a; dy += v * b;
        }
        const n = [-dx * 0.35, -dy * 0.35, 1];
        const len = Math.hypot(...n);
        const i = (y * N + x) * 4;
        img.data[i] = (n[0] / len * 0.5 + 0.5) * 255;
        img.data[i + 1] = (n[1] / len * 0.5 + 0.5) * 255;
        img.data[i + 2] = (n[2] / len * 0.5 + 0.5) * 255;
        img.data[i + 3] = 255;
      }
    }
    c.putImageData(img, 0, 0);
    t.update();
    t.wrapU = t.wrapV = B.Texture.WRAP_ADDRESSMODE;
    return t;
  }

  // ======================= ruas =======================
  _ruas() {
    const { zMin, zMax, meiaRua } = L;
    const p = [];
    const faixa = (x0, x1, z0, z1) => p.push(this._piso('rua', x0, x1, z0, z1, 0.02, 9));
    faixa(L.avSulX[0], L.avSulX[1], zMin, zMax);
    faixa(L.avNorteX[0], L.avNorteX[1], zMin, zMax);
    for (const z of L.transversaisZ) faixa(L.canteiroX[0], L.canteiroX[1], z - meiaRua, z + meiaRua);
    faixa(L.ruaInternaX[0], L.ruaInternaX[1], zMin, zMax);
    for (const z of L.transversaisZ) faixa(L.ruaInternaX[1], L.avSulX[0], z - meiaRua, z + meiaRua);
    this._juntar(p, this.M.asfalto, 'ruas');
  }

  // ======================= sinalização horizontal =======================
  _faixas(scene) {
    const lista = { branca: [], amarela: [], vermelha: [] };
    const marca = (tipo, x, z, w, d) => {
      const g = B.MeshBuilder.CreateGround('marca', { width: w, height: d }, scene);
      g.position.set(x, 0.035, z);
      lista[tipo].push(g);
    };
    const pertoDeCruzamento = (z, folga) => L.transversaisZ.some((t) => Math.abs(z - t) < L.meiaRua + folga);
    for (const [x0, x1] of [L.avSulX, L.avNorteX]) {
      const meio = (x0 + x1) / 2;
      for (let z = L.zMin + 2; z < L.zMax; z += 9) if (!pertoDeCruzamento(z, 14)) marca('branca', meio, z, 0.15, 3);
      for (const x of [x0 + 0.35, x1 - 0.35]) {
        for (let z = L.zMin; z < L.zMax; z += 10) if (!pertoDeCruzamento(z + 5, 9)) marca('branca', x, z + 5, 0.15, 10);
      }
    }
    for (let z = -1500; z < 1500; z += 50) marca('vermelha', (L.ciclovia[0] + L.ciclovia[1]) / 2, z + 25, 3, 50);
    const xi = (L.ruaInternaX[0] + L.ruaInternaX[1]) / 2;
    for (let z = L.zMin + 2; z < L.zMax; z += 9) if (!pertoDeCruzamento(z, 8)) marca('amarela', xi, z, 0.15, 3);
    for (const zt of L.transversaisZ) {
      for (let x = L.ruaInternaX[1] + 5; x < L.avSulX[0] - 5; x += 9) marca('amarela', x, zt, 3, 0.15);
      for (const lado of [-1, 1]) {
        const zf = zt + lado * (L.meiaRua + 4);
        for (const [x0, x1] of [L.avSulX, L.avNorteX, L.ruaInternaX]) {
          for (let x = x0 + 0.6; x < x1 - 0.4; x += 1.1) marca('branca', x + 0.25, zf, 0.55, 3.5);
        }
        for (const [x0, x1] of [L.avSulX, L.avNorteX]) marca('branca', (x0 + x1) / 2, zt + lado * (L.meiaRua + 6.6), x1 - x0, 0.4);
      }
    }
    this._juntar(lista.branca, this.M.tintaBranca, 'faixas-brancas');
    this._juntar(lista.amarela, this.M.tintaAmarela, 'faixas-amarelas');
    this._juntar(lista.vermelha, this.M.ciclovia, 'ciclovia');
  }

  // ======================= calçadas, canteiro, calçadão =======================
  _calcadas(scene) {
    const b = { calc: [], calcadao: [], grama: [], fio: [] };
    const meioFio = (x0, x1, z0, z1) => {
      const m = B.MeshBuilder.CreateBox('fio', { width: x1 - x0, height: 0.18, depth: z1 - z0 }, scene);
      m.position.set((x0 + x1) / 2, 0.09, (z0 + z1) / 2);
      b.fio.push(m);
    };
    const zs = [L.zMin - 6, ...L.transversaisZ, L.zMax + 6];
    for (let i = 0; i < zs.length - 1; i++) {
      const z0 = zs[i] + L.meiaRua, z1 = zs[i + 1] - L.meiaRua;
      if (z1 - z0 < 2) continue;
      b.calc.push(this._piso('c', L.calcadaOesteX[0], L.calcadaOesteX[1], z0, z1, 0.03, 2.4));
      b.grama.push(this._piso('g', L.canteiroX[0] + 0.3, L.canteiroX[1] - 0.3, z0, z1, 0.12, 5));
      meioFio(L.canteiroX[0], L.canteiroX[0] + 0.3, z0, z1);
      meioFio(L.canteiroX[1] - 0.3, L.canteiroX[1], z0, z1);
      meioFio(L.calcadaOesteX[1] - 0.25, L.calcadaOesteX[1], z0, z1);
      b.calc.push(this._piso('c', L.ruaInternaX[1], L.ruaInternaX[1] + 3, z0, z1, 0.03, 2.4));
      b.calc.push(this._piso('c', L.frenteLojasX, L.ruaInternaX[0], z0, z1, 0.03, 2.4));
    }
    b.calcadao.push(this._piso('cd', L.calcadaoX[0], L.calcadaoX[1], -1500, 1500, 0.03, 3));
    meioFio(L.ciclovia[1], L.ciclovia[1] + 0.25, -1500, 1500);
    this._juntar(b.calc, this.M.calcada, 'calcadas');
    this._juntar(b.calcadao, this.M.calcadao, 'calcadao');
    this._juntar(b.grama, this.M.grama, 'canteiros');
    this._juntar(b.fio, this.M.meioFio, 'meio-fio');
    this.limiteLeste = L.calcadaoX[1] + 2;
  }

  // ======================= prédios de frente para o mar =======================
  // Poucos prédios, mas com acabamento: varandas de verdade, vidro refletindo o céu,
  // térreo envidraçado, caixa d'água e muros nos lotes entre eles.
  _predios(scene) {
    const { M } = this;
    const listas = { vidro: [], guarda: [], caixilho: [], muro: [], paredes: M.paredes.map(() => []) };
    const caixa = (lista, w, h, d, x, y, z) => {
      const m = B.MeshBuilder.CreateBox('p', { width: w, height: h, depth: d }, scene);
      m.position.set(x, y, z); lista.push(m); return m;
    };
    const xf = L.calcadaOesteX[0];   // linha da fachada (encostada na calçada)

    // torre residencial com varandas na frente para o mar
    const torre = (z, larg, prof, andares, corIdx) => {
      const P = listas.paredes[corIdx];
      const terreo = 4.5, pe = 3.0;
      const alt = terreo + andares * pe;
      const xc = xf - 1.2 - prof / 2;               // corpo recuado 1,2 m (varandas avançam)
      caixa(P, prof, alt, larg, xc, alt / 2, z);
      // térreo: pilotis com vidro
      caixa(listas.vidro, 0.1, 3.2, larg - 4, xf - 1.15, 1.9, z);
      caixa(listas.caixilho, 0.3, 0.4, larg, xf - 1.0, terreo - 0.2, z);
      for (let a = 0; a < andares; a++) {
        const y = terreo + a * pe;
        // varanda (laje + guarda-corpo de vidro) e janelões
        caixa(P, 1.4, 0.2, larg - 0.6, xf - 0.6, y + 0.1, z);
        caixa(listas.guarda, 0.05, 1.05, larg - 0.8, xf + 0.05, y + 0.72, z);
        caixa(listas.caixilho, 0.08, 0.06, larg - 0.8, xf + 0.06, y + 1.25, z);
        caixa(listas.vidro, 0.1, 2.3, larg - 2, xf - 1.17, y + 1.4, z);
        // janelas laterais em faixa
        for (const s of [-1, 1]) caixa(listas.vidro, prof - 3, 1.4, 0.1, xc, y + 1.7, z + s * (larg / 2 + 0.03));
      }
      // cobertura: platibanda e caixa d'água
      caixa(P, prof + 0.2, 1.2, larg + 0.2, xc, alt + 0.6, z);
      caixa(P, prof * 0.4, 3.2, larg * 0.35, xc - prof * 0.15, alt + 2.2, z);
      this.obstaculos.push({ x: xc + 0.6, z, mx: prof / 2 + 0.7, mz: larg / 2 });
    };

    // prédio baixo (4 a 6 andares) com janelas em faixa nos quatro lados
    const medio = (z, larg, prof, andares, corIdx) => {
      const P = listas.paredes[corIdx];
      const alt = 1 + andares * 3;
      const xc = xf - prof / 2;
      caixa(P, prof, alt, larg, xc, alt / 2, z);
      for (let a = 0; a < andares; a++) {
        const y = 1 + a * 3;
        caixa(listas.vidro, 0.1, 1.5, larg - 3, xf + 0.03, y + 1.6, z);
        for (const s of [-1, 1]) caixa(listas.vidro, prof - 3, 1.5, 0.1, xc, y + 1.6, z + s * (larg / 2 + 0.03));
        caixa(listas.caixilho, 0.25, 0.12, larg, xf + 0.1, y + 0.75, z);
      }
      caixa(P, prof + 0.2, 0.9, larg + 0.2, xc, alt + 0.45, z);
      this.obstaculos.push({ x: xc, z, mx: prof / 2, mz: larg / 2 });
    };

    // muro com portão na frente dos lotes vazios
    const muro = (z0, z1) => {
      caixa(listas.muro, 0.3, 2.2, z1 - z0, xf - 0.3, 1.1, (z0 + z1) / 2);
      caixa(listas.caixilho, 0.12, 2.0, 3.4, xf - 0.1, 1.0, (z0 + z1) / 2);
      this.obstaculos.push({ x: xf - 0.3, z: (z0 + z1) / 2, mx: 0.3, mz: (z1 - z0) / 2 });
    };

    const sequencia = [
      ['torre', 30], ['medio', 26], ['torre', 30], ['casas', 26], ['torre', 30], ['medio', 26],
    ];
    for (const [z0, z1] of [[-294 + 4, -6 - 4], [6 + 4, 294 - 4]]) {
      const ocupado = sequencia.reduce((s, [, w]) => s + w, 0);
      const vao = (z1 - z0 - ocupado) / (sequencia.length + 1);
      let z = z0 + vao;
      sequencia.forEach(([tipo, w], i) => {
        const zc = z + w / 2;
        if (tipo === 'torre') torre(zc, w - 4, 22, 11 + Math.floor(rnd() * 6), i % 4);
        else if (tipo === 'medio') medio(zc, w - 2, 20, 4 + Math.floor(rnd() * 3), (i + 1) % 4);
        else { this._casa(scene, xf - 7, zc - 6.5, -Math.PI / 2); this._casa(scene, xf - 7, zc + 6.5, -Math.PI / 2); }
        muro(z + w + 0.5, z + w + vao - 0.5);
        if (i === 0) muro(z - vao + 0.5, z - 0.5);
        z += w + vao;
      });
    }
    const juntos = [
      this._juntar(listas.vidro, M.vidro, 'vidros'),
      this._juntar(listas.guarda, M.guarda, 'guarda-corpos'),
      this._juntar(listas.caixilho, M.caixilho, 'caixilhos'),
      this._juntar(listas.muro, M.muro, 'muros'),
      ...listas.paredes.map((l, i) => this._juntar(l, M.paredes[i], 'paredes' + i)),
    ].filter(Boolean);
    this.casters.push(...juntos.filter((m) => m.name !== 'vidros'));
  }

  // casa térrea/sobrado com telhado de duas águas
  _casa(scene, x, z, giro = 0) {
    this._casas = this._casas || { corpos: {}, telhados: [] };
    const cores = ['#f1e3c6', '#dfe8dc', '#f2d6c9', '#dde4ee', '#f3ead0'];
    const cor = cores[Math.floor(rnd() * cores.length)];
    const w = 11, d = 12, h = rnd() < 0.5 ? 3.6 : 6.4;
    const c = B.MeshBuilder.CreateBox('casa', { width: d, height: h, depth: w }, scene);
    c.position.set(x, h / 2, z);
    (this._casas.corpos[cor] = this._casas.corpos[cor] || []).push(c);
    const beiral = 0.5;
    const forma = [new B.Vector3(-w / 2 - beiral, 0, 0), new B.Vector3(w / 2 + beiral, 0, 0), new B.Vector3(0, w * 0.3, 0), new B.Vector3(-w / 2 - beiral, 0, 0)];
    const caminho = [new B.Vector3(0, 0, -d / 2 - beiral), new B.Vector3(0, 0, d / 2 + beiral)];
    const t = B.MeshBuilder.ExtrudeShape('telhado', { shape: forma, path: caminho, cap: B.Mesh.CAP_ALL, sideOrientation: B.Mesh.DOUBLESIDE }, scene);
    t.position.set(x, h, z);
    t.rotation.y = giro;
    this._casas.telhados.push(t);
    this.obstaculos.push({ x, z, mx: d / 2, mz: w / 2 });
  }

  _juntarCasas(scene) {
    if (!this._casas) return;
    let n = 0;
    for (const [cor, lista] of Object.entries(this._casas.corpos)) {
      const m = new B.StandardMaterial('casa' + n++, scene);
      m.diffuseColor = B.Color3.FromHexString(cor); m.specularColor = new B.Color3(0.03, 0.03, 0.03);
      this.casters.push(this._juntar(lista, m, 'casas'));
    }
    const mt = new B.StandardMaterial('telha', scene);
    mt.diffuseColor = B.Color3.FromHexString('#a9503a'); mt.specularColor = new B.Color3(0.05, 0.05, 0.05);
    this.casters.push(this._juntar(this._casas.telhados, mt, 'telhados'));
  }

  // ======================= comércio (rua interna) =======================
  _comercio(scene) {
    const lojas = [
      ['Padaria Pão Quente', '#e9b97c'], ['Açaí da Orla', '#7d52b0'], ['Farmácia Bem Viver', '#3a9a62'],
      ['Mercado Bom Preço', '#d0564b'], ['Loja do Rael', '#f2c230', T.desenhosRael], ['Sorveteria Mar Gelado', '#7cc3e0'],
    ];
    const frente = L.frenteLojasX;
    const larg = 18, alt = 8, prof = 14;
    let i = 0;
    for (const [z0, z1] of [[-294, -6], [6, 294]]) {
      for (let z = z0 + 30; z < z1 - 20 && i < lojas.length; z += 85) {
        const [nome, cor, extra] = lojas[i++];
        const x = frente - prof / 2;
        const corpo = B.MeshBuilder.CreateBox('loja', { width: prof, height: alt, depth: larg }, scene);
        corpo.position.set(x, alt / 2, z);
        const mc = new B.StandardMaterial('parede-' + nome, scene);
        mc.diffuseColor = B.Color3.FromHexString(cor); mc.specularColor = new B.Color3(0.04, 0.04, 0.04);
        corpo.material = mc;
        this.casters.push(corpo);
        const plat = B.MeshBuilder.CreateBox('platibanda', { width: prof + 0.4, height: 0.6, depth: larg + 0.4 }, scene);
        plat.position.set(x, alt + 0.3, z); plat.material = this.M.paredes[0];
        const m = new B.StandardMaterial('loja-' + nome, scene);
        m.diffuseTexture = T.texLoja(scene, nome, cor, extra);
        m.specularColor = new B.Color3(0.08, 0.08, 0.08);
        const f = B.MeshBuilder.CreatePlane('fachada-loja', { width: larg - 0.4, height: alt - 0.4 }, scene);
        f.position.set(frente + 0.06, alt / 2, z); f.rotation.y = -Math.PI / 2; f.material = m;
        const toldo = B.MeshBuilder.CreateBox('toldo', { width: 1.6, height: 0.12, depth: larg - 2 }, scene);
        toldo.position.set(frente + 0.75, 3.4, z); toldo.rotation.z = -0.25;
        const mt = new B.StandardMaterial('toldo' + i, scene);
        mt.diffuseColor = B.Color3.FromHexString(cor).scale(0.85); toldo.material = mt;
      }
    }
    // casas e prédios baixos entre as lojas (só cenário)
    for (let z = -290; z < 290; z += 42) {
      if (L.transversaisZ.some((t) => Math.abs(z - t) < 14)) continue;
      const temLoja = [-264, -179, -94, 36, 121, 206].some((zl) => Math.abs(z - zl) < 18);
      if (!temLoja && rnd() < 0.8) this._casa(scene, frente - 7, z, Math.PI / 2);
    }
    this._juntarCasas(scene);
  }

  // ======================= vegetação =======================
  _vegetacao(scene) {
    const mTronco = new B.StandardMaterial('tronco', scene);
    mTronco.diffuseColor = B.Color3.FromHexString('#6b5643'); mTronco.specularColor = B.Color3.Black();
    const folhas = ['#2f5524', '#3a6629', '#27491e'].map((h, i) => {
      const m = new B.StandardMaterial('folha' + i, scene);
      m.diffuseColor = B.Color3.FromHexString(h); m.specularColor = new B.Color3(0.04, 0.05, 0.03);
      return m;
    });

    // amendoeira: tronco inclinado e copa irregular em "andares" (forma típica da orla)
    const pa = [];
    const tr = B.MeshBuilder.CreateCylinder('t', { diameterTop: 0.3, diameterBottom: 0.55, height: 4.2, tessellation: 9 }, scene);
    tr.position.y = 2.1; tr.material = mTronco; pa.push(tr);
    let k = 0;
    for (const [y, raio, n] of [[4.4, 3.4, 6], [5.6, 2.6, 5], [6.6, 1.6, 3]]) {
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + y;
        const c = B.MeshBuilder.CreateIcoSphere('c', { radius: 1.25 + rnd() * 0.5, subdivisions: 2, flat: true }, scene);
        c.scaling.y = 0.55;
        c.position.set(Math.cos(a) * raio * 0.6, y + rnd() * 0.3, Math.sin(a) * raio * 0.6);
        c.material = folhas[k++ % 3];
        pa.push(c);
      }
    }
    const amendoeira = B.Mesh.MergeMeshes(pa, true, true, undefined, false, true);
    amendoeira.isVisible = false;

    // coqueiro: tronco curvo com anéis e folhas recortadas (textura com transparência)
    const mFolhaC = new B.StandardMaterial('folha-coqueiro', scene);
    mFolhaC.diffuseTexture = this._texturaFolhaCoqueiro(scene);
    mFolhaC.diffuseTexture.hasAlpha = true;
    mFolhaC.useAlphaFromDiffuseTexture = false;
    mFolhaC.backFaceCulling = false;
    mFolhaC.specularColor = new B.Color3(0.05, 0.06, 0.03);
    const mTroncoC = new B.StandardMaterial('tronco-coqueiro', scene);
    mTroncoC.diffuseTexture = this._texturaTroncoCoqueiro(scene);
    mTroncoC.specularColor = B.Color3.Black();
    const pc = [];
    const caminho = [];
    for (let i = 0; i <= 10; i++) { const t = i / 10; caminho.push(new B.Vector3(Math.sin(t * 1.3) * 1.1, t * 9, 0)); }
    const tronco = B.MeshBuilder.CreateTube('t', { path: caminho, radiusFunction: (i) => 0.24 - i * 0.008, tessellation: 8 }, scene);
    tronco.material = mTroncoC; pc.push(tronco);
    const topo = caminho[caminho.length - 1];
    const folhasC = [];
    for (let i = 0; i < 11; i++) {
      // fita curva que sai do topo e cai, com largura que afina na ponta
      const giro = (i / 11) * Math.PI * 2 + rnd() * 0.3;
      const queda = 0.25 + (i % 3) * 0.18;
      const comp = 4.2 + rnd() * 0.8;
      const pts = [], N = 7;
      for (let s = 0; s <= N; s++) {
        const t = s / N;
        const r = t * comp, y = Math.sin(t * Math.PI * 0.55) * 0.9 - t * t * comp * queda;
        pts.push([r, y]);
      }
      const linhas = [];
      for (const lado of [-1, 1]) {
        const linha = pts.map(([r, y], s) => {
          const w = (1 - s / N) * 0.75 + 0.05;
          const lx = r, lz = lado * w;
          return new B.Vector3(topo.x + Math.cos(giro) * lx - Math.sin(giro) * lz, topo.y + y, topo.z + Math.sin(giro) * lx + Math.cos(giro) * lz);
        });
        linhas.push(linha);
      }
      const f = B.MeshBuilder.CreateRibbon('f', { pathArray: linhas, sideOrientation: B.Mesh.DOUBLESIDE }, scene);
      f.material = mFolhaC;
      folhasC.push(f);
    }
    const coco = B.MeshBuilder.CreateSphere('coco', { diameter: 0.7, segments: 5 }, scene);
    coco.position.set(topo.x, topo.y - 0.35, topo.z); coco.material = mTronco; pc.push(coco);
    const troncoC = B.Mesh.MergeMeshes(pc, true, true, undefined, false, true);
    const copaC = B.Mesh.MergeMeshes(folhasC, true, true);
    copaC.material = mFolhaC;
    troncoC.isVisible = false; copaC.isVisible = false;

    let n = 0;
    const plantar = (bases, x, z, esc, raio) => {
      const g = rnd() * 6.28;
      for (const base of bases) {
        const a = base.createInstance('arv' + n++);
        a.position.set(x, 0, z); a.rotation.y = g; a.scaling.setAll(esc);
        a.freezeWorldMatrix();
      }
      if (raio) this.obstaculos.push({ x, z, r: raio });
    };
    const longe = (z, d = 16) => L.transversaisZ.every((t) => Math.abs(z - t) > d);
    for (let z = L.zMin + 20; z < L.zMax - 5; z += 46) if (longe(z)) plantar([amendoeira], 25, z, 0.85 + rnd() * 0.25, 0.5);
    for (let z = -900; z < 900; z += 34) plantar([troncoC, copaC], 51.5 + rnd() * 1.5, z + rnd() * 6, 0.9 + rnd() * 0.3, 0.4);
    for (let z = -900; z < 900; z += 140) plantar([troncoC, copaC], 60 + rnd() * 8, z + rnd() * 20, 0.85 + rnd() * 0.3);
    for (let z = L.zMin + 30; z < L.zMax; z += 64) if (longe(z)) plantar([amendoeira], 7.2, z, 0.7, 0.45);
    this.sombras.addShadowCaster(amendoeira);
    this.sombras.addShadowCaster(troncoC);
    this.sombras.addShadowCaster(copaC);
  }

  _texturaFolhaCoqueiro(scene) {
    const t = new B.DynamicTexture('tex-folha-coq', { width: 256, height: 64 }, scene, true);
    const c = t.getContext();
    c.clearRect(0, 0, 256, 64);
    // nervura central + folíolos finos inclinados
    c.strokeStyle = '#6b7a3a'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(0, 32); c.lineTo(256, 32); c.stroke();
    for (let x = 4; x < 252; x += 5) {
      const g = 60 + Math.random() * 40;
      c.strokeStyle = `rgb(${g * 0.6 | 0},${g + 60 | 0},${g * 0.4 | 0})`;
      c.lineWidth = 2.2;
      const comp = 30 * (1 - x / 300);
      for (const s of [-1, 1]) {
        c.beginPath(); c.moveTo(x, 32); c.lineTo(x + 10, 32 + s * comp); c.stroke();
      }
    }
    t.update();
    return t;
  }

  _texturaTroncoCoqueiro(scene) {
    const t = new B.DynamicTexture('tex-tronco-coq', { width: 64, height: 256 }, scene, true);
    const c = t.getContext();
    c.fillStyle = '#8c7a62'; c.fillRect(0, 0, 64, 256);
    for (let y = 0; y < 256; y += 9) { c.fillStyle = 'rgba(60,45,30,.45)'; c.fillRect(0, y, 64, 2); c.fillStyle = 'rgba(255,240,210,.15)'; c.fillRect(0, y + 3, 64, 2); }
    t.update();
    return t;
  }

  // ======================= postes de luz =======================
  _postes(scene) {
    const mLuz = new B.StandardMaterial('luminaria', scene);
    mLuz.diffuseColor = B.Color3.FromHexString('#f5f1e0'); mLuz.emissiveColor = B.Color3.FromHexString('#3a382f');
    this.mLuzPoste = mLuz;
    const partes = [];
    const haste = B.MeshBuilder.CreateCylinder('h', { diameterTop: 0.14, diameterBottom: 0.26, height: 10, tessellation: 10 }, scene);
    haste.position.y = 5; haste.material = this.M.metal; partes.push(haste);
    for (const s of [-1, 1]) {
      const braco = B.MeshBuilder.CreateCylinder('b', { diameter: 0.09, height: 2.4, tessellation: 6 }, scene);
      braco.rotation.z = Math.PI / 2; braco.position.set(s * 1.2, 9.8, 0); braco.material = this.M.metal; partes.push(braco);
      const cab = B.MeshBuilder.CreateBox('l', { width: 0.9, height: 0.16, depth: 0.4 }, scene);
      cab.position.set(s * 2.3, 9.75, 0); cab.material = mLuz; partes.push(cab);
    }
    const poste = B.Mesh.MergeMeshes(partes, true, true, undefined, false, true);
    poste.isVisible = false;
    this.sombras.addShadowCaster(poste);
    let n = 0;
    const longe = (z) => L.transversaisZ.every((t) => Math.abs(z - t) > 12);
    for (let z = L.zMin + 23; z < L.zMax; z += 46) {
      if (!longe(z)) continue;
      const p = poste.createInstance('poste' + n++); p.position.set(25, 0, z); p.freezeWorldMatrix();
    }
    for (let z = -700; z < 700; z += 40) {
      const p = poste.createInstance('poste' + n++); p.position.set(46.5, 0, z); p.rotation.y = Math.PI / 2; p.scaling.setAll(0.85); p.freezeWorldMatrix();
      this.obstaculos.push({ x: 46.5, z, r: 0.3 });
    }
  }

  // ======================= semáforos de braço e placas =======================
  _semaforosEPlacas(scene) {
    const mPoste = this.M.metalEscuro;
    const luz = (nome, hex) => { const m = new B.StandardMaterial(nome, scene); m.diffuseColor = B.Color3.FromHexString(hex); m.specularColor = new B.Color3(0.5, 0.5, 0.5); return m; };
    this.luzes = { vermelho: luz('sem-vermelho', '#4a0b0b'), amarelo: luz('sem-amarelo', '#4a3a0b'), verde: luz('sem-verde', '#0b3a18') };
    const semaforo = (x, z, comprimento, lado, olhaPara) => {
      const pai = new B.TransformNode('semaforo', scene);
      pai.position.set(x, 0, z);
      const haste = B.MeshBuilder.CreateCylinder('sh', { diameter: 0.28, height: 6.6, tessellation: 10 }, scene);
      haste.position.y = 3.3; haste.material = mPoste; haste.parent = pai;
      const braco = B.MeshBuilder.CreateCylinder('sb', { diameter: 0.18, height: comprimento, tessellation: 8 }, scene);
      braco.rotation.z = Math.PI / 2; braco.position.set(lado * comprimento / 2, 6.4, 0); braco.material = mPoste; braco.parent = pai;
      for (const px of [lado * comprimento * 0.55, lado * comprimento * 0.95]) {
        const cx = B.MeshBuilder.CreateBox('sc', { width: 0.45, height: 1.3, depth: 0.4 }, scene);
        cx.position.set(px, 5.7, 0); cx.material = mPoste; cx.parent = pai;
        [['vermelho', 6.1], ['amarelo', 5.7], ['verde', 5.3]].forEach(([cor, y]) => {
          const l = B.MeshBuilder.CreateCylinder('sl', { diameter: 0.3, height: 0.06, tessellation: 14 }, scene);
          l.rotation.x = Math.PI / 2; l.position.set(px, y, olhaPara * 0.21); l.material = this.luzes[cor]; l.parent = pai;
        });
      }
      this.obstaculos.push({ x, z, r: 0.35 });
    };
    for (const zt of L.transversaisZ) {
      semaforo(L.calcadaOesteX[0] + 2.5, zt + L.meiaRua + 8, 10, 1, 1);
      semaforo(L.ciclovia[1] + 1.2, zt - L.meiaRua - 8, 11, -1, -1);
    }
    const placa = (textura, x, z, giro, larg = 0.9, alt = 0.9, h = 2.4) => {
      const m = new B.StandardMaterial('placa-' + x + '-' + z, scene);
      m.diffuseTexture = textura; m.useAlphaFromDiffuseTexture = true; m.backFaceCulling = false;
      m.specularColor = new B.Color3(0.1, 0.1, 0.1);
      const p = B.MeshBuilder.CreatePlane('placa', { width: larg, height: alt }, scene);
      p.position.set(x, h, z); p.rotation.y = giro; p.material = m;
      const poste = B.MeshBuilder.CreateCylinder('pp', { diameter: 0.08, height: h, tessellation: 6 }, scene);
      poste.position.set(x, h / 2 - 0.2, z + 0.05); poste.material = mPoste;
      this.obstaculos.push({ x, z, r: 0.25 });
    };
    const pare = T.texPlacaPare(scene), vel = T.texPlacaVelocidade(scene, 40), ped = T.texPlacaPedestre(scene);
    const nomes = { '-300': 'Enseada do Suá', '0': 'Jardim Camburi', '300': 'Praia do Canto' };
    for (const zt of L.transversaisZ) {
      placa(pare, L.calcadaOesteX[0] + 1, zt - L.meiaRua - 1.2, -Math.PI / 2);
      placa(T.texPlacaRua(scene, 'Av. Dante Michelini'), L.calcadaOesteX[0] + 1.5, zt + L.meiaRua + 1.5, Math.PI, 3.2, 0.8, 3.2);
      placa(T.texPlacaRua(scene, nomes[String(zt)]), L.ruaInternaX[1] + 1.5, zt + L.meiaRua + 1.5, Math.PI, 3.2, 0.8, 3.2);
      placa(ped, L.ciclovia[1] + 1.2, zt - L.meiaRua - 22, Math.PI);
    }
    for (const z of [-150, 150]) placa(vel, L.ciclovia[1] + 1.2, z, Math.PI);
  }

  _cicloSemaforo() {
    const t = this.tempo % 14;
    const fase = t < 6 ? 'verde' : t < 8 ? 'amarelo' : 'vermelho';
    const acesa = { vermelho: '#ff2a1e', amarelo: '#ffb81a', verde: '#2bff6a' };
    const apagada = { vermelho: '#3a0b0b', amarelo: '#3a2e0b', verde: '#0b2e14' };
    for (const cor of ['vermelho', 'amarelo', 'verde']) this.luzes[cor].emissiveColor = B.Color3.FromHexString(cor === fase ? acesa[cor] : apagada[cor]);
  }

  // ======================= praça (norte) e marina =======================
  _praca(scene) {
    const piso = this._piso('praca', L.ruaInternaX[0], L.calcadaOesteX[1], 306, 380, 0.03, 3);
    piso.material = this.M.calcadao; piso.freezeWorldMatrix();
    const mAreia = this.M.areia;
    const mRede = new B.StandardMaterial('rede', scene); mRede.diffuseColor = B.Color3.FromHexString('#f4f4f4');
    for (const x of [-26, -6]) {
      const q = this._piso('quadra', x - 8, x + 8, 332, 358, 0.05, 6); q.material = mAreia;
      const rede = B.MeshBuilder.CreateBox('rede', { width: 10, height: 1, depth: 0.05 }, scene);
      rede.position.set(x, 2.2, 345); rede.material = mRede;
      for (const s of [-1, 1]) { const p = B.MeshBuilder.CreateCylinder('pr', { diameter: 0.12, height: 2.7 }, scene); p.position.set(x + s * 5.2, 1.35, 345); p.material = mRede; }
      this.obstaculos.push({ x, z: 345, mx: 5.5, mz: 0.5 });
    }
    const mMadeira = new B.StandardMaterial('pier', scene); mMadeira.diffuseColor = B.Color3.FromHexString('#7c6046');
    const pier = B.MeshBuilder.CreateBox('pier', { width: 70, height: 0.4, depth: 4 }, scene);
    pier.position.set(L.marX + 30, 0.6, 345); pier.material = mMadeira;
    const mCasco = new B.StandardMaterial('casco', scene); mCasco.diffuseColor = B.Color3.FromHexString('#f4f4f4'); mCasco.specularColor = new B.Color3(0.4, 0.4, 0.4);
    for (let i = 0; i < 7; i++) {
      const x = L.marX + 18 + i * 10, z = 345 + (i % 2 ? 9 : -9);
      const casco = B.MeshBuilder.CreateBox('casco', { width: 2.4, height: 0.9, depth: 7 }, scene);
      casco.position.set(x, 0.4, z); casco.material = mCasco;
      const mastro = B.MeshBuilder.CreateCylinder('mastro', { diameter: 0.12, height: 9 }, scene);
      mastro.position.set(x, 5, z); mastro.material = mCasco;
    }
  }

  // ======================= shopping (sul), pontos de ônibus, quiosques =======================
  _shopping(scene) {
    const corpo = B.MeshBuilder.CreateBox('shopping', { width: 50, height: 16, depth: 50 }, scene);
    corpo.position.set(-18, 8, -345); corpo.material = this.M.paredes[1];
    this.casters.push(corpo);
    const vidro = B.MeshBuilder.CreateBox('shop-vidro', { width: 0.4, height: 10, depth: 34 }, scene);
    vidro.position.set(7.1, 7, -345); vidro.material = this.M.vidro;
    const ml = new B.StandardMaterial('shop-letreiro', scene); ml.diffuseTexture = T.texPlacaRua(scene, 'Shopping da Orla');
    const letreiro = B.MeshBuilder.CreatePlane('shop-placa', { width: 20, height: 5 }, scene);
    letreiro.position.set(7.4, 13.5, -345); letreiro.rotation.y = -Math.PI / 2; letreiro.material = ml;
    this.obstaculos.push({ x: -18, z: -345, mx: 25, mz: 25 });

    const mAbrigo = this.M.metal;
    for (const z of [-150, 150]) {
      const teto = B.MeshBuilder.CreateBox('abrigo', { width: 2.6, height: 0.12, depth: 12 }, scene);
      teto.position.set(7.5, 2.8, z); teto.material = mAbrigo;
      for (const dz of [-5.5, 5.5]) { const c = B.MeshBuilder.CreateCylinder('ac', { diameter: 0.12, height: 2.8 }, scene); c.position.set(6.6, 1.4, z + dz); c.material = mAbrigo; }
      this.obstaculos.push({ x: 7.5, z, mx: 1.3, mz: 6 });
    }
    const mQ = new B.StandardMaterial('quiosque', scene); mQ.diffuseColor = B.Color3.FromHexString('#efeae0');
    const mTeto = new B.StandardMaterial('quiosque-teto', scene); mTeto.diffuseColor = B.Color3.FromHexString('#b8632e');
    for (let z = -260; z <= 260; z += 130) {
      const q = B.MeshBuilder.CreateCylinder('quiosque', { diameter: 5, height: 3, tessellation: 8 }, scene);
      q.position.set(49, 1.5, z); q.material = mQ; this.casters.push(q);
      const t = B.MeshBuilder.CreateCylinder('quiosque-teto', { diameterTop: 0.2, diameterBottom: 7, height: 1.8, tessellation: 8 }, scene);
      t.position.set(49, 3.9, z); t.material = mTeto; this.casters.push(t);
      this.obstaculos.push({ x: 49, z, r: 2.8 });
    }
  }

  // ======================= fundo: cidade distante, morros, convento, ponte, ilha =======================
  _fundo(scene) {
    // silhueta de prédios mais atrás (dá profundidade de cidade, sem detalhe)
    const mFachada = [0, 1, 2].map((v) => { const m = new B.StandardMaterial('fundo' + v, scene); m.diffuseTexture = T.texFachada(scene, v); m.specularColor = B.Color3.Black(); return m; });
    const porMat = [[], [], []];
    for (let z = -560; z < 560; z += 55 + rnd() * 25) {
      const x = -110 - rnd() * 90, w = 22 + rnd() * 10, h = 24 + rnd() * 40, v = Math.floor(rnd() * 3);
      const lado = (l) => new B.Vector4(0, 0, l / 8, h / 12);
      const p = B.MeshBuilder.CreateBox('fundo', { width: w, height: h, depth: w, faceUV: [lado(w), lado(w), lado(w), lado(w), new B.Vector4(0, 0, 0, 0), new B.Vector4(0, 0, 0, 0)] }, scene);
      p.position.set(x, h / 2, z); porMat[v].push(p);
    }
    porMat.forEach((l, i) => this._juntar(l, mFachada[i], 'fundo-cidade'));

    const mMorro = new B.StandardMaterial('morro', scene); mMorro.diffuseColor = B.Color3.FromHexString('#3e5a33'); mMorro.specularColor = B.Color3.Black();
    const mPedra = new B.StandardMaterial('pedra', scene); mPedra.diffuseColor = B.Color3.FromHexString('#8d8a80'); mPedra.specularColor = B.Color3.Black();
    // morro com relevo irregular (cristas e vales), não uma cúpula lisa
    const morro = (x, z, larg, alt, m = mMorro) => {
      const s = B.MeshBuilder.CreateSphere('morro', { diameter: 1, segments: 24, slice: 0.5, updatable: true }, scene);
      const pos = s.getVerticesData(B.VertexBuffer.PositionKind);
      const sem = x * 0.013 + z * 0.007;
      for (let i = 0; i < pos.length; i += 3) {
        const px = pos[i], py = pos[i + 1], pz = pos[i + 2];
        const a = Math.atan2(pz, px);
        const ruido = 1 + 0.16 * Math.sin(a * 3 + sem) + 0.09 * Math.sin(a * 7 + sem * 2) + 0.05 * Math.sin(a * 13 + py * 9);
        const pico = 0.75 + 0.35 * Math.cos(a * 2 + sem);   // um lado mais alto que o outro
        pos[i] = px * ruido; pos[i + 2] = pz * ruido; pos[i + 1] = py * pico * (1 + 0.08 * Math.sin(a * 11 + sem));
      }
      s.updateVerticesData(B.VertexBuffer.PositionKind, pos);
      s.createNormals(true);
      s.convertToFlatShadedMesh();
      s.scaling.set(larg, alt * 2, larg * 0.8); s.position.set(x, 0, z); s.material = m; s.freezeWorldMatrix();
    };
    morro(-1250, 300, 700, 150); morro(-1150, -500, 600, 120); morro(-300, 1500, 1000, 280);
    morro(250, -1150, 260, 120, mPedra);
    const mConv = this.M.paredes[0];
    const conv = B.MeshBuilder.CreateBox('convento', { width: 26, height: 14, depth: 16 }, scene); conv.position.set(250, 124, -1150); conv.material = mConv;
    const torre = B.MeshBuilder.CreateBox('torre', { width: 7, height: 22, depth: 7 }, scene); torre.position.set(262, 131, -1150); torre.material = mConv;
    const pts = [];
    for (let i = 0; i <= 20; i++) { const t = i / 20; pts.push(new B.Vector3(-150 + t * 1100, 8 + Math.sin(t * Math.PI) * 70, -900 + t * 80)); }
    const tab = B.MeshBuilder.CreateTube('ponte', { path: pts, radius: 4, tessellation: 4 }, scene); tab.material = this.M.paredes[3];
    for (let i = 2; i < 20; i += 2) {
      const p = pts[i];
      const pil = B.MeshBuilder.CreateBox('pilar', { width: 5, height: p.y, depth: 5 }, scene); pil.position.set(p.x, p.y / 2, p.z); pil.material = this.M.paredes[3];
    }
    morro(230, 40, 60, 14, mMorro);
  }

  atualizar(dt) {
    this.tempo += dt;
    this.mMar.bumpTexture.uOffset += dt * 0.006;
    this.mMar.bumpTexture.vOffset += dt * 0.0025;
    this._cicloSemaforo();
  }

  bateu(pontos, raio) {
    for (const p of pontos) {
      if (p.x > this.limiteLeste || p.x < L.frenteLojasX || p.z > 372 || p.z < -372) return true;
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

// Mundo de TESTE da etapa 1: um pátio com uma pista em volta, árvores e cones.
// Serve só para treinar os controles. O litoral de Vitória entra na etapa 3.
import { CONFIG } from './config.js';

const B = window.BABYLON;

// números "aleatórios" sempre iguais (o mundo fica igual toda vez)
function sorteio(semente) {
  let a = semente;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TAMANHO = 400;        // metros de lado
const PX = 4096;            // resolução da textura do chão (~10 pixels por metro)
const ESCALA = PX / TAMANHO;
const PISTA = { meia: 114, raio: 26, largura: 12 };

export class MundoTeste {
  constructor(scene) {
    this.scene = scene;
    this.obstaculos = [];   // { x, z, r } círculos ou { x, z, mx, mz } caixas
    this.inicio = { x: -40, z: -PISTA.meia, angulo: Math.PI / 2 };

    this._ceuELuz(scene);
    this._chao(scene);
    this._arvores(scene);
    this._cones(scene);
    this._predios(scene);
    this._muro(scene);
  }

  _ceuELuz(scene) {
    const ceu = B.Color3.FromHexString('#9fd0f0');
    scene.clearColor = new B.Color4(ceu.r, ceu.g, ceu.b, 1);
    scene.fogMode = B.Scene.FOGMODE_LINEAR;
    scene.fogColor = ceu;
    scene.fogStart = 140;
    scene.fogEnd = 420;
    scene.ambientColor = new B.Color3(0.3, 0.3, 0.3);

    const ambiente = new B.HemisphericLight('ambiente', new B.Vector3(0, 1, 0), scene);
    ambiente.intensity = 0.65;
    ambiente.groundColor = new B.Color3(0.35, 0.38, 0.32);

    this.sol = new B.DirectionalLight('sol', new B.Vector3(-0.45, -1, 0.35), scene);
    this.sol.intensity = 1.0;
    this.sol.position = new B.Vector3(30, 60, -30);
    this.sol.autoUpdateExtends = true;
    this.sol.autoCalcShadowZBounds = true;

    this.sombras = new B.ShadowGenerator(1024, this.sol);
    this.sombras.usePercentageCloserFiltering = true;
    this.sombras.filteringQuality = B.ShadowGenerator.QUALITY_LOW;
    this.sombras.darkness = 0.35;
    this.sombras.bias = 0.002;
  }

  // o sol acompanha o caminhão, para a sombra ficar sempre nítida
  seguirSol(pos) {
    this.sol.position.set(pos.x + 25, 50, pos.z - 20);
  }

  _chao(scene) {
    const chao = B.MeshBuilder.CreateGround('chao', { width: TAMANHO, height: TAMANHO }, scene);
    const tex = new B.DynamicTexture('tex-chao', { width: PX, height: PX }, scene, true);
    tex.anisotropicFilteringLevel = 16;
    const ctx = tex.getContext();
    const m = (v) => (v + TAMANHO / 2) * ESCALA;   // metros -> pixels
    const s = (v) => v * ESCALA;                    // tamanho em metros -> pixels
    const rnd = sorteio(7);

    // grama com manchas
    ctx.fillStyle = '#5e8f3e';
    ctx.fillRect(0, 0, PX, PX);
    for (let i = 0; i < 30000; i++) {
      ctx.fillStyle = rnd() < 0.5 ? 'rgba(80,120,50,.35)' : 'rgba(120,160,70,.3)';
      const t = 2 + rnd() * 6;
      ctx.fillRect(rnd() * PX, rnd() * PX, t, t);
    }

    const retanguloArredondado = (meia, raio) => {
      const a = m(-meia), b = m(meia), r = s(raio);
      ctx.beginPath();
      ctx.moveTo(a + r, a);
      ctx.arcTo(b, a, b, b, r);
      ctx.arcTo(b, b, a, b, r);
      ctx.arcTo(a, b, a, a, r);
      ctx.arcTo(a, a, b, a, r);
      ctx.closePath();
    };

    // pista em volta
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#8a8a8a';               // acostamento
    ctx.lineWidth = s(PISTA.largura + 2);
    retanguloArredondado(PISTA.meia, PISTA.raio);
    ctx.stroke();
    ctx.strokeStyle = '#47494c';               // asfalto
    ctx.lineWidth = s(PISTA.largura);
    retanguloArredondado(PISTA.meia, PISTA.raio);
    ctx.stroke();

    // linhas brancas das bordas
    ctx.strokeStyle = '#e9e9e4';
    ctx.lineWidth = s(0.25);
    const borda = PISTA.largura / 2 - 0.4;
    retanguloArredondado(PISTA.meia + borda, PISTA.raio + borda); ctx.stroke();
    retanguloArredondado(PISTA.meia - borda, PISTA.raio - borda); ctx.stroke();

    // faixa central amarela tracejada (padrão brasileiro)
    ctx.strokeStyle = '#f2c230';
    ctx.lineWidth = s(0.25);
    ctx.setLineDash([s(4), s(8)]);
    retanguloArredondado(PISTA.meia, PISTA.raio);
    ctx.stroke();
    ctx.setLineDash([]);

    // rua ligando a pista ao pátio
    ctx.fillStyle = '#47494c';
    ctx.fillRect(m(-5), m(-PISTA.meia), s(10), s(PISTA.meia - 50));
    ctx.fillRect(m(-5), m(50), s(10), s(PISTA.meia - 50));
    ctx.fillStyle = '#f2c230';
    for (let z = -PISTA.meia + 8; z < -52; z += 12) ctx.fillRect(m(-0.12), m(z), s(0.25), s(4));
    for (let z = 52; z < PISTA.meia - 8; z += 12) ctx.fillRect(m(-0.12), m(z), s(0.25), s(4));

    // faixa de pedestres
    ctx.fillStyle = '#ececE6';
    for (let x = -4.2; x < 4.4; x += 1.2) ctx.fillRect(m(x), m(-60), s(0.6), s(3.5));

    // pátio central
    ctx.fillStyle = '#5a5c5f';
    ctx.fillRect(m(-50), m(-50), s(100), s(100));
    ctx.strokeStyle = '#e9e9e4';
    ctx.lineWidth = s(0.2);
    ctx.strokeRect(m(-49), m(-49), s(98), s(98));
    // vagas de estacionamento
    for (let x = -44; x <= 40; x += 4) {
      ctx.fillStyle = '#e9e9e4';
      ctx.fillRect(m(x), m(30), s(0.2), s(14));
      ctx.fillRect(m(x), m(-44), s(0.2), s(14));
    }

    tex.update();
    const mat = new B.StandardMaterial('mat-chao', scene);
    mat.diffuseTexture = tex;
    mat.specularColor = new B.Color3(0.05, 0.05, 0.05);
    chao.material = mat;
    chao.receiveShadows = true;
    chao.freezeWorldMatrix();
    mat.freeze();
  }

  // está num lugar livre (fora da pista, do pátio e da rua)?
  _livre(x, z, folga) {
    const ax = Math.abs(x), az = Math.abs(z);
    const naPista = Math.max(ax, az) > PISTA.meia - PISTA.largura / 2 - folga &&
                    Math.max(ax, az) < PISTA.meia + PISTA.largura / 2 + folga;
    const noPatio = ax < 50 + folga && az < 50 + folga;
    const naRua = ax < 5 + folga && az < PISTA.meia;
    return !naPista && !noPatio && !naRua;
  }

  _arvores(scene) {
    const mTronco = new B.StandardMaterial('tronco', scene);
    mTronco.diffuseColor = B.Color3.FromHexString('#6b4a2f');
    mTronco.specularColor = B.Color3.Black();
    const mCopa = new B.StandardMaterial('copa', scene);
    mCopa.diffuseColor = B.Color3.FromHexString('#3f7a35');
    mCopa.specularColor = B.Color3.Black();

    const tronco = B.MeshBuilder.CreateCylinder('tronco', { diameterTop: 0.35, diameterBottom: 0.5, height: 3, tessellation: 7 }, scene);
    tronco.material = mTronco;
    const copa = B.MeshBuilder.CreateIcoSphere('copa', { radius: 2.2, subdivisions: 1, flat: true }, scene);
    copa.material = mCopa;
    tronco.isVisible = false;
    copa.isVisible = false;

    const rnd = sorteio(21);
    let n = 0;
    for (let i = 0; i < 400 && n < 110; i++) {
      const x = (rnd() - 0.5) * 2 * (CONFIG.limiteMundo - 8);
      const z = (rnd() - 0.5) * 2 * (CONFIG.limiteMundo - 8);
      if (!this._livre(x, z, 4)) continue;
      if (Math.abs(x) > 140 || Math.abs(z) > 140) { if (rnd() < 0.5) continue; } // deixa espaço para os prédios
      const esc = 0.8 + rnd() * 0.6;
      const t = tronco.createInstance('t' + n);
      t.position.set(x, 1.5 * esc, z);
      t.scaling.setAll(esc);
      t.freezeWorldMatrix();
      const c = copa.createInstance('c' + n);
      c.position.set(x, 4 * esc, z);
      c.scaling.setAll(esc);
      c.rotation.y = rnd() * 6;
      c.freezeWorldMatrix();
      this.obstaculos.push({ x, z, r: 0.5 * esc });
      n++;
    }
  }

  _cones(scene) {
    const mCone = new B.StandardMaterial('cone', scene);
    mCone.diffuseColor = B.Color3.FromHexString('#f26a1b');
    mCone.specularColor = new B.Color3(0.2, 0.2, 0.2);
    const cone = B.MeshBuilder.CreateCylinder('cone', { diameterTop: 0.05, diameterBottom: 0.55, height: 0.8, tessellation: 10 }, scene);
    cone.material = mCone;
    cone.isVisible = false;
    // fila de cones no pátio, para fazer zigue-zague
    let i = 0;
    for (let x = -30; x <= 30; x += 10) {
      const c = cone.createInstance('cone' + i++);
      c.position.set(x, 0.4, 0);
      c.freezeWorldMatrix();
      this.obstaculos.push({ x, z: 0, r: 0.35 });
    }
  }

  _predios(scene) {
    const cores = ['#d9cfc1', '#c9d6df', '#e3c9a8', '#b8c4b0', '#e8e2d6'];
    const mats = cores.map((c, i) => {
      const m = new B.StandardMaterial('predio' + i, scene);
      m.diffuseColor = B.Color3.FromHexString(c);
      m.specularColor = new B.Color3(0.05, 0.05, 0.05);
      return m;
    });
    const rnd = sorteio(99);
    const lados = [
      (t) => ({ x: t, z: 162 }), (t) => ({ x: t, z: -162 }),
      (t) => ({ x: 162, z: t }), (t) => ({ x: -162, z: t }),
    ];
    let i = 0;
    for (const lado of lados) {
      for (let t = -150; t <= 150; t += 38) {
        if (rnd() < 0.3) continue;
        const { x, z } = lado(t + (rnd() - 0.5) * 8);
        const larg = 12 + rnd() * 10, comp = 12 + rnd() * 10, alt = 8 + rnd() * 26;
        const p = B.MeshBuilder.CreateBox('predio' + i, { width: larg, height: alt, depth: comp }, scene);
        p.position.set(x, alt / 2, z);
        p.material = mats[i % mats.length];
        p.freezeWorldMatrix();
        this.obstaculos.push({ x, z, mx: larg / 2, mz: comp / 2 });
        i++;
      }
    }
  }

  _muro(scene) {
    // mureta baixa marcando o fim do mundo (a parede de verdade é invisível)
    const mMuro = new B.StandardMaterial('muro', scene);
    mMuro.diffuseColor = B.Color3.FromHexString('#bdb8ad');
    mMuro.specularColor = B.Color3.Black();
    const L = CONFIG.limiteMundo + 2;
    const partes = [
      [L * 2, 0.6, L], [L * 2, 0.6, -L],
    ];
    for (const [larg, alt, z] of partes) {
      for (const giro of [0, Math.PI / 2]) {
        const muro = B.MeshBuilder.CreateBox('muro', { width: larg, height: alt * 2, depth: 0.4 }, scene);
        muro.material = mMuro;
        muro.rotation.y = giro;
        if (giro === 0) muro.position.set(0, alt, z); else muro.position.set(z, alt, 0);
        muro.freezeWorldMatrix();
      }
    }
  }

  // Algum dos pontos encostou em algo? raio = "gordura" do caminhão em volta do ponto
  bateu(pontos, raio) {
    const lim = CONFIG.limiteMundo;
    for (const p of pontos) {
      if (Math.abs(p.x) > lim || Math.abs(p.z) > lim) return true;
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

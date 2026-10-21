// As rodas do caminhão, no estilo "realismo fantástico":
// ideias de brincadeira (roda de madeira, de fogo, engrenagem...) construídas
// como se fossem peças de verdade, com material e acabamento reais.
import { pneu as formaPneu, aro as formaAro } from './formas.js';

const B = window.BABYLON;

export const TIPOS_RODA = [
  { id: 'aluminio', raio: 0.53 },
  { id: 'madeira', raio: 0.53 },
  { id: 'engrenagem', raio: 0.55 },
  { id: 'dourada', raio: 0.53 },
  { id: 'fogo', raio: 0.53 },
  { id: 'monstro', raio: 0.7 },
];
export const raioDaRoda = (tipo) => (TIPOS_RODA.find((t) => t.id === tipo) || TIPOS_RODA[0]).raio;

// ---------- materiais das rodas (criados uma vez por cena) ----------
function mat(scene, nome, cor, brilho = 0.2, emissivo = null) {
  const m = new B.StandardMaterial(nome, scene);
  m.diffuseColor = B.Color3.FromHexString(cor);
  m.specularColor = new B.Color3(brilho, brilho, brilho);
  m.specularPower = brilho > 0.5 ? 96 : 32;
  if (emissivo) m.emissiveColor = B.Color3.FromHexString(emissivo);
  return m;
}

function texturaMadeira(scene) {
  const t = new B.DynamicTexture('tex-madeira', { width: 256, height: 256 }, scene, true);
  const c = t.getContext();
  c.fillStyle = '#8a5a33';
  c.fillRect(0, 0, 256, 256);
  // veios
  for (let i = 0; i < 70; i++) {
    const y = Math.random() * 256;
    c.strokeStyle = `rgba(${60 + Math.random() * 40},${35 + Math.random() * 20},15,${0.25 + Math.random() * 0.35})`;
    c.lineWidth = 1 + Math.random() * 3;
    c.beginPath();
    c.moveTo(0, y);
    for (let x = 0; x <= 256; x += 32) c.lineTo(x, y + Math.sin(x / 40 + i) * 4);
    c.stroke();
  }
  t.update();
  return t;
}

function texturaChama(scene) {
  const t = new B.DynamicTexture('tex-chama', { width: 64, height: 64 }, scene, false);
  const c = t.getContext();
  const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,220,1)');
  g.addColorStop(0.3, 'rgba(255,190,60,.9)');
  g.addColorStop(0.65, 'rgba(255,90,10,.45)');
  g.addColorStop(1, 'rgba(255,40,0,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, 64, 64);
  t.hasAlpha = true;
  t.update();
  return t;
}

export function materiaisRodas(scene) {
  scene.metadata = scene.metadata || {};
  if (scene.metadata.matsRodas) return scene.metadata.matsRodas;
  const madeira = mat(scene, 'madeira', '#ffffff', 0.08);
  madeira.diffuseTexture = texturaMadeira(scene);
  const M = {
    pneu: mat(scene, 'r-pneu', '#1b1b1b', 0.05),
    borracha: mat(scene, 'r-borracha', '#141414', 0.02),
    aluminio: mat(scene, 'r-aluminio', '#d9dde1', 0.9),
    cinza: mat(scene, 'r-cinza', '#3b3e42', 0.3),
    madeira,
    ferro: mat(scene, 'r-ferro', '#35363a', 0.45),
    rebite: mat(scene, 'r-rebite', '#77797d', 0.7),
    aco: mat(scene, 'r-aco', '#5f666d', 0.8),
    roxo: mat(scene, 'r-roxo', '#5a2fb0', 0.75),
    cromo: mat(scene, 'r-cromo', '#b9c0c6', 1.0),
    ouro: mat(scene, 'r-ouro', '#c48a12', 0.9),
    pretoBrilho: mat(scene, 'r-preto-brilho', '#121315', 0.9),
    brasa: mat(scene, 'r-brasa', '#ff5a00', 0.3, '#ff4a00'),
    vermelho: mat(scene, 'r-vermelho', '#c8201b', 0.6),
    chama: texturaChama(scene),
  };
  scene.metadata.matsRodas = M;
  return M;
}

// aplica o reflexo do céu nos metais das rodas
export function reflexoRodas(scene, textura) {
  const M = materiaisRodas(scene);
  for (const [m, borda, frente] of [[M.aluminio, 0.75, 0.45], [M.aco, 0.55, 0.2], [M.cromo, 0.85, 0.45],
    [M.ouro, 0.45, 0.12], [M.pretoBrilho, 0.5, 0.1], [M.roxo, 0.45, 0.15], [M.vermelho, 0.4, 0.1]]) {
    m.reflectionTexture = textura;
    const f = new B.FresnelParameters();
    f.bias = 0.05; f.power = 2.2;
    f.leftColor = new B.Color3(borda, borda, borda);
    f.rightColor = new B.Color3(frente, frente, frente);
    m.reflectionFresnelParameters = f;
  }
}

// ---------- construção ----------
// ctx: { scene, giro (nó que gira), lado (-1/1), larg (largura total), dupla (rodado duplo) }
// Devolve { partes: [malhas], atualizar(velocidade, dt) }
export function montarRoda(tipo, ctx) {
  const { scene, giro, lado } = ctx;
  const M = materiaisRodas(scene);
  const R = raioDaRoda(tipo);
  const partes = [];
  const extras = { sistemas: [] };

  const add = (m, material) => { m.material = material; m.parent = giro; partes.push(m); return m; };
  const cil = (diam, comp, x, y, z, material, lados = 20, topo = null) => {
    const m = B.MeshBuilder.CreateCylinder('r', { diameter: diam, diameterTop: topo ?? diam, height: comp, tessellation: lados }, scene);
    m.rotation.z = Math.PI / 2;
    m.position.set(x, y, z);
    return add(m, material);
  };
  const caixa = (w, h, d, x, y, z, material) => {
    const m = B.MeshBuilder.CreateBox('r', { width: w, height: h, depth: d }, scene);
    m.position.set(x, y, z);
    return add(m, material);
  };
  const anel = (raioExt, raioInt, largura, x, material, lados = 32) => {
    const w = largura / 2;
    const perfil = [[raioInt, -w], [raioExt, -w], [raioExt, w], [raioInt, w]].map(([a, b]) => new B.Vector3(a, b, 0));
    const m = B.MeshBuilder.CreateLathe('anel', { shape: perfil, tessellation: lados, closed: true }, scene);
    m.rotation.z = Math.PI / 2;
    m.position.x = x;
    return add(m, material);
  };
  // coloca algo na circunferência: ang em radianos, raio r, na posição x
  const naVolta = (malha, ang, r) => {
    malha.position.y = Math.cos(ang) * r;
    malha.position.z = Math.sin(ang) * r;
    malha.rotation.x = ang;
    return malha;
  };

  // largura de cada "unidade" de roda (no rodado duplo são duas lado a lado)
  const unidades = ctx.dupla
    ? [{ x: -ctx.larg * 0.255, w: ctx.larg * 0.49 }, { x: ctx.larg * 0.255, w: ctx.larg * 0.49 }]
    : [{ x: 0, w: ctx.larg }];
  const externa = unidades[lado > 0 ? unidades.length - 1 : 0];
  const face = externa.x + lado * (externa.w / 2);   // lado de fora da roda (onde fica o aro)

  const pneuNormal = (perfilBaixo = false) => {
    for (const u of unidades) {
      const p = formaPneu('pneu', R, u.w, scene);
      if (perfilBaixo) p.scaling.set(1, 1, 1);
      p.position.x = u.x;
      add(p, M.pneu);
      for (const off of [-0.25, 0, 0.25]) {
        const s = B.MeshBuilder.CreateTorus('sulco', { diameter: R * 2 - 0.004, thickness: 0.018, tessellation: 32 }, scene);
        s.rotation.z = Math.PI / 2;
        s.position.x = u.x + off * u.w;
        add(s, M.borracha);
      }
    }
  };

  switch (tipo) {
    // ===== Alumínio polido (padrão de fábrica) =====
    default:
    case 'aluminio': {
      pneuNormal();
      const a = formaAro('aro', R * 0.62, lado, scene);
      a.position.x = face - lado * 0.06;
      add(a, M.aluminio);
      cil(0.3, 0.12, face - lado * 0.01, 0, 0, M.aluminio);
      cil(0.16, 0.05, face + lado * 0.05, 0, 0, M.cinza, 16);
      for (let i = 0; i < 10; i++) {
        const g = (i / 10) * Math.PI * 2;
        cil(0.04, 0.05, face + lado * 0.04, Math.sin(g) * 0.115, Math.cos(g) * 0.115, M.cinza, 6);
      }
      for (let i = 0; i < 8; i++) {
        const g = (i / 8) * Math.PI * 2 + 0.2;
        cil(0.085, 0.06, face - lado * 0.035, Math.sin(g) * 0.24, Math.cos(g) * 0.24, M.ferro, 10);
      }
      break;
    }

    // ===== Madeira: roda de carroça com aro de ferro rebitado =====
    case 'madeira': {
      for (const u of unidades) {
        anel(R, R - 0.06, u.w * 0.9, u.x, M.ferro, 40);             // aro de ferro (onde rola)
        anel(R - 0.05, R - 0.17, u.w * 0.82, u.x, M.madeira, 40);   // cambota de madeira
        for (let i = 0; i < 16; i++) {                              // rebites do aro
          const r = B.MeshBuilder.CreateSphere('rebite', { diameter: 0.045, segments: 4 }, scene);
          naVolta(r, (i / 16) * Math.PI * 2, R - 0.03);
          r.position.x = u.x + lado * (u.w * 0.45);
          add(r, M.rebite);
        }
        for (let i = 0; i < 10; i++) {                              // raios torneados
          const raio = B.MeshBuilder.CreateCylinder('raio', { diameterTop: 0.06, diameterBottom: 0.09, height: R - 0.2, tessellation: 8 }, scene);
          naVolta(raio, (i / 10) * Math.PI * 2, (R - 0.2) / 2 + 0.1);
          raio.position.x = u.x;
          add(raio, M.madeira);
        }
        cil(0.3, u.w * 0.9, u.x, 0, 0, M.madeira, 16);              // cubo
      }
      cil(0.34, 0.05, face, 0, 0, M.ferro, 16);                      // tampa de ferro
      cil(0.12, 0.08, face + lado * 0.03, 0, 0, M.rebite, 12);
      break;
    }

    // ===== Engrenagem: aço com dentes, disco roxo anodizado e espigão cromado =====
    case 'engrenagem': {
      for (const u of unidades) {
        anel(R - 0.08, R - 0.2, u.w * 0.85, u.x, M.aco, 48);
        const dentes = 18;
        for (let i = 0; i < dentes; i++) {
          const d = caixa(u.w * 0.85, 0.11, 0.13, u.x, 0, 0, M.aco);
          naVolta(d, (i / dentes) * Math.PI * 2, R - 0.06);
        }
        cil((R - 0.18) * 2, u.w * 0.3, u.x, 0, 0, M.roxo, 32);       // disco
      }
      for (let i = 0; i < 6; i++) {                                  // furos de alívio
        const g = (i / 6) * Math.PI * 2;
        cil(0.13, 0.03, face - lado * 0.02, Math.sin(g) * 0.24, Math.cos(g) * 0.24, M.ferro, 12);
      }
      cil(0.26, 0.08, face, 0, 0, M.cromo, 20);
      const espigao = B.MeshBuilder.CreateCylinder('espigao', { diameterTop: 0.0, diameterBottom: 0.16, height: 0.32, tessellation: 12 }, scene);
      espigao.rotation.z = -lado * Math.PI / 2;
      espigao.position.x = face + lado * 0.18;
      add(espigao, M.cromo);
      break;
    }

    // ===== Dourada: aro esportivo de 5 raios, pneu de perfil baixo =====
    case 'dourada': {
      pneuNormal(true);
      for (const u of unidades) anel(R * 0.66, R * 0.6, u.w * 0.9, u.x, M.ouro, 40);  // tambor do aro
      const raios = 5;
      for (let i = 0; i < raios; i++) {
        for (const d of [-0.1, 0.1]) {                               // raio em "Y" (dois braços)
          const b = caixa(0.045, R * 0.5, 0.06, face - lado * 0.04, 0, 0, M.ouro);
          naVolta(b, (i / raios) * Math.PI * 2 + d, R * 0.33);
        }
      }
      cil(0.26, 0.1, face - lado * 0.03, 0, 0, M.ouro, 20);
      cil(0.12, 0.06, face + lado * 0.02, 0, 0, M.pretoBrilho, 16);
      break;
    }

    // ===== Fogo: aro preto brilhante com miolo em brasa e chamas =====
    case 'fogo': {
      pneuNormal();
      for (const u of unidades) anel(R * 0.64, R * 0.55, u.w * 0.9, u.x, M.pretoBrilho, 40);
      const brasa = cil(R * 1.12, 0.03, face - lado * 0.08, 0, 0, M.brasa, 32);    // brasa atrás dos raios
      extras.brasa = brasa;
      for (let i = 0; i < 6; i++) {
        const b = caixa(0.05, R * 0.56, 0.09, face - lado * 0.03, 0, 0, M.pretoBrilho);
        naVolta(b, (i / 6) * Math.PI * 2, R * 0.32);
      }
      cil(0.24, 0.1, face - lado * 0.02, 0, 0, M.pretoBrilho, 20);
      cil(0.1, 0.06, face + lado * 0.03, 0, 0, M.brasa, 12);

      // chamas: partículas que saem da roda e sobem
      const ps = new B.ParticleSystem('chamas', 160, scene);
      ps.particleTexture = M.chama;
      const emissor = B.MeshBuilder.CreateBox('emissor', { size: 0.01 }, scene);
      emissor.isVisible = false;
      emissor.parent = giro.parent;                                  // não gira com a roda
      emissor.position.x = face;
      emissor.rotation.z = Math.PI / 2;                              // eixo do cilindro = eixo da roda
      ps.emitter = emissor;
      ps.createCylinderEmitter(R * 0.9, 0.05, 0, 0);
      ps.minSize = 0.12; ps.maxSize = 0.34;
      ps.minLifeTime = 0.18; ps.maxLifeTime = 0.45;
      ps.color1 = new B.Color4(1, 0.75, 0.3, 1);
      ps.color2 = new B.Color4(1, 0.35, 0.05, 1);
      ps.colorDead = new B.Color4(0.3, 0.05, 0, 0);
      ps.blendMode = B.ParticleSystem.BLENDMODE_ADD;
      ps.gravity = new B.Vector3(0, 3.5, 0);
      ps.direction1 = new B.Vector3(-0.2, 0.6, -0.4);
      ps.direction2 = new B.Vector3(0.2, 1.2, 0.4);
      ps.minEmitPower = 0.4; ps.maxEmitPower = 1.2;
      ps.emitRate = 15;
      ps.start();
      extras.sistemas.push(ps);
      break;
    }

    // ===== Monstro: pneu off-road gigante com cravos e aro vermelho =====
    case 'monstro': {
      for (const u of unidades) {
        const p = formaPneu('pneu', R - 0.04, u.w, scene);
        p.position.x = u.x;
        add(p, M.pneu);
        const cravos = 22;
        for (let i = 0; i < cravos; i++) {                           // cravos em "V", alternados
          for (const lado2 of [-1, 1]) {
            const c = caixa(u.w * 0.42, 0.07, 0.15, u.x + lado2 * u.w * 0.22, 0, 0, M.borracha);
            naVolta(c, (i / cravos) * Math.PI * 2 + (lado2 > 0 ? Math.PI / cravos : 0), R - 0.04);
            c.rotation.y = lado2 * 0.25;
          }
        }
      }
      const a = formaAro('aro', R * 0.56, lado, scene);
      a.position.x = face - lado * 0.08;
      add(a, M.vermelho);
      cil(R * 1.0, 0.05, face - lado * 0.04, 0, 0, M.cinza, 32);   // anel de trava (beadlock)
      for (let i = 0; i < 16; i++) {
        const g = (i / 16) * Math.PI * 2;
        cil(0.04, 0.05, face, Math.sin(g) * R * 0.45, Math.cos(g) * R * 0.45, M.cromo, 6);
      }
      cil(0.3, 0.12, face - lado * 0.02, 0, 0, M.vermelho, 20);
      cil(0.14, 0.05, face + lado * 0.04, 0, 0, M.cromo, 16);
      break;
    }
  }

  return {
    partes,
    raio: R,
    atualizar(velocidade, dt, tempo) {
      if (extras.sistemas.length) {
        const v = Math.abs(velocidade);
        for (const ps of extras.sistemas) {
          ps.emitRate = 12 + v * 22;
          ps.minSize = 0.12 + v * 0.012;
          ps.maxSize = 0.34 + v * 0.03;
        }
      }
      if (extras.brasa) {
        const pulso = 0.75 + Math.sin(tempo * 9) * 0.12 + Math.sin(tempo * 23) * 0.06;
        extras.brasa.material.emissiveColor.set(1 * pulso, 0.3 * pulso, 0);
      }
    },
    descartar() {
      for (const ps of extras.sistemas) { ps.emitter.dispose(); ps.dispose(); }
      for (const p of partes) p.dispose();
    },
  };
}

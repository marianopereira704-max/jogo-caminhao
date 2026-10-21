// Modelo da caçamba basculante 8x4, inspirado no VW Constellation 31.320 bitruck.
// Feito só com formas geométricas, sem marcas nem logos.
// O caminhão aponta para +z (frente), +x é o lado direito, y é para cima.
// Medidas em metros, próximas das reais (~10,4 m de comprimento).

import { caixaArredondada, pneu as formaPneu, aro as formaAro } from './formas.js';

const B = window.BABYLON;

function mat(scene, nome, cor, brilho = 0.15, emissivo = null) {
  const m = new B.StandardMaterial(nome, scene);
  m.diffuseColor = B.Color3.FromHexString(cor);
  m.specularColor = new B.Color3(brilho, brilho, brilho);
  m.specularPower = brilho > 0.5 ? 96 : 32;
  if (emissivo) m.emissiveColor = B.Color3.FromHexString(emissivo);
  return m;
}

// textura do para-choque traseiro zebrado (vermelho e branco)
function texturaZebrada(scene) {
  const t = new B.DynamicTexture('zebra', { width: 256, height: 32 }, scene, true);
  const c = t.getContext();
  c.fillStyle = '#f2f2f2';
  c.fillRect(0, 0, 256, 32);
  c.fillStyle = '#d0141a';
  for (let x = -32; x < 256; x += 32) {
    c.beginPath();
    c.moveTo(x, 32); c.lineTo(x + 16, 0); c.lineTo(x + 32, 0); c.lineTo(x + 16, 32);
    c.closePath(); c.fill();
  }
  t.update();
  return t;
}

export const MEDIDAS = {
  comprimento: 10.4,
  largura: 2.5,
  raioRoda: 0.53,
  eixos: [4.1, 2.15, -2.35, -3.7],     // posição z de cada eixo (os dois primeiros viram)
  pontosContato: [4.6, -4.6],          // frente e traseira, para colisão
};

export function montarCacamba8x4(scene) {
  const M = {
    pinturaCabine: mat(scene, 'pintura-cabine', '#f4f5f2', 0.45),
    pinturaCacamba: mat(scene, 'pintura-cacamba', '#f1f2ef', 0.3),
    preto: mat(scene, 'preto', '#232527', 0.2),
    pretoFosco: mat(scene, 'preto-fosco', '#18191b', 0.05),
    cinza: mat(scene, 'cinza', '#3b3e42', 0.2),
    vidro: mat(scene, 'vidro', '#3d5266', 0.9),
    laranja: mat(scene, 'laranja', '#ff6a1a', 0.3, '#3a1404'),
    prata: mat(scene, 'prata', '#d9dde1', 0.9),
    pneu: mat(scene, 'pneu', '#1b1b1b', 0.04),
    tanque: mat(scene, 'tanque', '#e4e6e8', 0.6),
    lona: mat(scene, 'lona', '#2f6fb8', 0.1),
    farol: mat(scene, 'farol', '#f3f1e6', 0.9, '#3a382f'),
    lanterna: mat(scene, 'lanterna', '#c3141a', 0.6, '#3a0405'),
    refletivo: mat(scene, 'refletivo', '#d9141b', 0.5, '#2a0203'),
    pisca: mat(scene, 'pisca', '#f5a623', 0.6, '#3a2405'),
  };
  const mZebra = new B.StandardMaterial('zebra', scene);
  mZebra.diffuseTexture = texturaZebrada(scene);
  mZebra.specularColor = new B.Color3(0.2, 0.2, 0.2);

  const raiz = new B.TransformNode('caminhao-8x4', scene);
  const partes = [];

  // r = raio das bordas. Sem r, arredonda só um pouquinho (nada de canto vivo).
  const caixa = (larg, alt, prof, x, y, z, m, pai = raiz, nome = 'peca', r = null) => {
    const raio = r ?? Math.min(0.03, 0.3 * Math.min(larg, alt, prof));
    const p = caixaArredondada(nome, larg, alt, prof, raio, scene, raio > 0.06 ? 4 : 2);
    p.position.set(x, y, z);
    p.material = m;
    p.parent = pai;
    partes.push(p);
    return p;
  };
  // cilindro com o eixo na direção indicada ('x' = de lado, 'z' = para frente)
  const cilindro = (diam, comp, x, y, z, m, eixo = 'z', pai = raiz, lados = 20, nome = 'cil') => {
    const p = B.MeshBuilder.CreateCylinder(nome, { diameter: diam, height: comp, tessellation: lados }, scene);
    if (eixo === 'z') p.rotation.x = Math.PI / 2;
    if (eixo === 'x') p.rotation.z = Math.PI / 2;
    p.position.set(x, y, z);
    p.material = m;
    p.parent = pai;
    partes.push(p);
    return p;
  };
  const espelhar = (fn) => { fn(-1); fn(1); };

  // =================== CHASSI ===================
  espelhar((s) => caixa(0.12, 0.32, 10.0, s * 0.46, 1.05, -0.15, M.pretoFosco));
  for (const z of [4.6, 3.0, 1.2, -0.6, -2.9, -4.8]) caixa(0.92, 0.18, 0.12, 0, 1.05, z, M.pretoFosco);

  // tanque de combustível (lado esquerdo) e caixa de baterias (lado direito)
  cilindro(0.6, 1.15, -1.0, 1.05, 0.45, M.tanque, 'z', raiz, 20);
  caixa(0.06, 0.62, 0.06, -0.78, 1.05, 0.0, M.pretoFosco);
  caixa(0.06, 0.62, 0.06, -0.78, 1.05, 0.9, M.pretoFosco);
  caixa(0.5, 0.5, 0.75, 0.98, 1.0, 0.45, M.preto);
  cilindro(0.32, 1.0, 0.95, 0.72, -0.9, M.cinza, 'z', raiz, 14); // tanque de ar

  // =================== CABINE ===================
  const cab = { z: 4.0, base: 1.05, alt: 2.05, prof: 2.1 };
  const yc = cab.base + cab.alt / 2;
  caixa(2.45, cab.alt, cab.prof, 0, yc, cab.z, M.pinturaCabine, raiz, 'cabine', 0.2);
  // teto / defletor preto
  caixa(2.38, 0.34, 2.02, 0, cab.base + cab.alt + 0.1, cab.z - 0.02, M.preto, raiz, 'teto', 0.15);
  caixa(2.3, 0.12, 0.34, 0, cab.base + cab.alt + 0.2, cab.z + 1.1, M.preto, raiz, 'pala', 0.06);
  // para-brisa e quebra-sol
  caixa(2.16, 0.74, 0.06, 0, 2.62, 5.05, M.vidro, raiz, 'parabrisa', 0.03);
  caixa(2.1, 0.1, 0.06, 0, 3.01, 5.07, M.preto);
  caixa(2.2, 0.05, 0.05, 0, 2.24, 5.09, M.preto);                           // borracha do vidro
  espelhar((s) => { const l = caixa(0.03, 0.45, 0.03, s * 0.35, 2.4, 5.1, M.pretoFosco); l.rotation.z = s * 1.2; }); // limpadores
  // faixa escura com os detalhes laranja
  caixa(1.5, 0.15, 0.04, 0, 2.18, 5.065, M.preto);
  espelhar((s) => {
    const f = caixa(0.6, 0.05, 0.03, s * 1.0, 2.2, 5.07, M.laranja);
    f.rotation.z = -s * 0.12;
  });
  // grade com frisos
  caixa(1.42, 0.72, 0.08, 0, 1.72, 5.06, M.preto, raiz, 'grade', 0.05);
  for (let i = 0; i < 4; i++) caixa(1.32, 0.05, 0.04, 0, 1.47 + i * 0.17, 5.1, M.cinza);
  // faróis redondos
  espelhar((s) => {
    cilindro(0.38, 0.05, s * 0.95, 1.72, 5.07, M.preto, 'z', raiz, 24);
    const f = cilindro(0.27, 0.06, s * 0.95, 1.72, 5.09, M.farol, 'z', raiz, 24, 'farol');
    f.metadata = { farol: true };
    caixa(0.06, 0.18, 0.04, s * 1.2, 1.72, 5.07, M.pisca);
  });
  // para-choque preto grande, com faróis de neblina
  caixa(2.5, 0.72, 0.4, 0, 1.0, 5.08, M.preto, raiz, 'parachoque', 0.12);
  caixa(0.7, 0.16, 0.04, 0, 1.12, 5.29, M.pretoFosco);
  espelhar((s) => {
    cilindro(0.24, 0.05, s * 0.92, 1.12, 5.28, M.pretoFosco, 'z', raiz, 20);
    cilindro(0.18, 0.06, s * 0.92, 1.12, 5.29, M.farol, 'z', raiz, 20);
  });
  // laterais da cabine
  espelhar((s) => {
    const xl = s * 1.235;
    caixa(0.04, 0.72, 0.95, xl, 2.62, 4.45, M.vidro);            // janela da porta
    caixa(0.04, 0.55, 0.3, xl, 2.62, 3.28, M.vidro);             // janela traseira pequena
    caixa(0.045, 0.6, 1.9, xl, 1.36, 4.05, M.preto);             // saia preta "off-road"
    caixa(0.03, 1.95, 0.025, s * 1.237, 2.1, 3.55, M.pretoFosco); // linha da porta (atrás)
    caixa(0.03, 1.75, 0.025, s * 1.237, 2.05, 4.72, M.pretoFosco); // linha da porta (frente)
    caixa(0.05, 0.05, 0.22, s * 1.25, 2.18, 3.75, M.cinza);       // maçaneta
    const lr = caixa(0.05, 0.07, 0.8, xl, 1.72, 3.55, M.laranja); // detalhe laranja
    lr.rotation.x = 0.35;
    caixa(0.5, 0.06, 0.4, s * 1.05, 0.72, 4.4, M.preto);         // degrau
    caixa(0.5, 0.06, 0.4, s * 1.05, 0.38, 4.4, M.preto);
    caixa(0.14, 0.08, 1.15, s * 1.16, 1.14, 4.1, M.preto);        // para-lama dianteiro
    // retrovisores
    caixa(0.32, 0.05, 0.05, s * 1.38, 2.95, 4.98, M.preto);
    caixa(0.05, 0.62, 0.05, s * 1.52, 2.7, 4.98, M.preto);
    caixa(0.12, 0.56, 0.3, s * 1.6, 2.62, 4.98, M.preto, raiz, 'retrovisor', 0.05);
    caixa(0.12, 0.26, 0.24, s * 1.6, 2.2, 4.98, M.preto, raiz, 'retrovisor', 0.05);
    caixa(0.02, 0.48, 0.24, s * 1.67, 2.62, 4.98, M.vidro);
  });


  // =================== CAÇAMBA (gira na dobradiça traseira) ===================
  const cacPivo = new B.TransformNode('cacamba-pivo', scene);
  cacPivo.parent = raiz;
  cacPivo.position.set(0, 1.42, -4.85);
  const L = 6.75;         // comprimento
  const H = 1.32;         // altura das laterais
  const zc = L / 2;       // centro (em relação à dobradiça)
  const yb = 0.12;        // espessura do assoalho
  caixa(2.5, yb, L, 0, yb / 2, zc, M.pinturaCacamba, cacPivo);
  espelhar((s) => caixa(0.12, 0.2, L, s * 0.5, -0.1, zc, M.pretoFosco, cacPivo)); // vigas de baixo
  espelhar((s) => {
    const x = s * 1.21;
    caixa(0.08, H, L, x, yb + H / 2, zc, M.pinturaCacamba, cacPivo);
    caixa(0.1, 0.24, L - 0.1, s * 1.235, yb + H - 0.12, zc, M.preto, cacPivo);  // borda preta
    for (let z = 0.15; z < L; z += 0.95) {                                       // reforços verticais
      caixa(0.08, H, 0.12, s * 1.27, yb + H / 2, z, M.pinturaCacamba, cacPivo);
    }
    caixa(0.07, 0.08, L, s * 1.27, yb + 0.25, zc, M.pinturaCacamba, cacPivo);   // friso inferior
    for (let z = 0.6; z < L - 0.3; z += 0.8) {
      caixa(0.03, 0.06, 0.16, s * 1.315, yb + 0.12, z, M.refletivo, cacPivo);  // refletivos
    }
  });
  // parede da frente mais alta + protetor de cabine inclinado
  caixa(2.5, H + 0.45, 0.1, 0, yb + (H + 0.45) / 2, L, M.pinturaCacamba, cacPivo);
  const prot = caixa(2.5, 0.07, 1.15, 0, yb + H + 0.52, L + 0.52, M.pinturaCacamba, cacPivo);
  prot.rotation.x = -0.12;
  espelhar((s) => caixa(0.1, H + 0.45, 0.14, s * 1.2, yb + (H + 0.45) / 2, L - 0.02, M.pinturaCacamba, cacPivo));
  // lona azul enrolada no alto da frente
  cilindro(0.28, 2.3, 0, yb + H + 0.1, L - 0.35, M.lona, 'x', cacPivo, 16);
  // tampa traseira com frisos e lanternas
  caixa(2.5, H, 0.1, 0, yb + H / 2, -0.03, M.pinturaCacamba, cacPivo);
  for (const y of [0.45, 0.95]) caixa(2.42, 0.08, 0.08, 0, yb + y, -0.1, M.pinturaCacamba, cacPivo);
  caixa(2.5, 0.12, 0.14, 0, yb + H - 0.06, -0.05, M.preto, cacPivo);
  for (let x = -0.9; x <= 0.91; x += 0.36) caixa(0.14, 0.05, 0.03, x, yb + 0.2, -0.1, M.refletivo, cacPivo);

  // pistão hidráulico (estica quando a caçamba levanta)
  const pistaoBase = new B.Vector3(0, 1.2, 1.55);
  const pistao = cilindro(0.2, 1, 0, 0, 0, M.prata, 'y', raiz, 14, 'pistao');
  const pistaoCamisa = cilindro(0.28, 0.7, 0, 0, 0, M.pretoFosco, 'y', raiz, 14, 'pistao-camisa');
  const pontoNaCacamba = new B.Vector3(0, -0.15, 6.15); // em relação à dobradiça

  // =================== TRASEIRA DO CHASSI ===================
  espelhar((s) => {
    caixa(0.32, 0.2, 0.06, s * 0.95, 0.98, -5.03, M.lanterna);
    caixa(0.08, 0.5, 0.08, s * 0.9, 0.75, -5.05, M.pretoFosco);    // suportes do para-choque
  });
  caixa(2.3, 0.22, 0.12, 0, 0.55, -5.12, mZebra);                  // para-choque zebrado

  // =================== RODAS ===================
  const R = MEDIDAS.raioRoda;
  const rodasDianteiras = [];
  const giros = [];
  const pneus = [];
  const aros = [];
  const roda = (lado, z, dianteira) => {
    const pivo = new B.TransformNode('pivo-roda', scene);
    pivo.parent = raiz;
    pivo.position.set(lado * (dianteira ? 1.04 : 0.93), R, z);
    const giro = new B.TransformNode('giro-roda', scene);
    giro.parent = pivo;
    const larg = dianteira ? 0.36 : 0.68;
    const face = lado * (larg / 2);
    if (dianteira) {
      const p = formaPneu('pneu', R, larg, scene); p.parent = giro; p.material = M.pneu; partes.push(p); pneus.push(p);
    } else {
      // rodado duplo: dois pneus lado a lado
      for (const d of [-1, 1]) {
        const p = formaPneu('pneu', R, larg * 0.49, scene);
        p.position.x = d * larg * 0.255; p.parent = giro; p.material = M.pneu; partes.push(p); pneus.push(p);
      }
    }
    // sulcos da banda de rodagem
    for (const off of [-0.25, 0, 0.25]) {
      const sulco = B.MeshBuilder.CreateTorus('sulco', { diameter: R * 2 - 0.004, thickness: 0.018, tessellation: 32 }, scene);
      sulco.rotation.z = Math.PI / 2;
      sulco.position.x = off * larg;
      sulco.material = M.pretoFosco; sulco.parent = giro; partes.push(sulco);
    }
    // aro de alumínio em prato, cubo e porcas
    const a = formaAro('aro', R * 0.62, lado, scene);
    a.position.x = face - lado * 0.06; a.parent = giro; a.material = M.prata; partes.push(a); aros.push(a);
    cilindro(0.3, 0.12, face - lado * 0.01, 0, 0, M.prata, 'x', giro, 20, 'cubo');
    cilindro(0.16, 0.05, face + lado * 0.05, 0, 0, M.cinza, 'x', giro, 16, 'tampa-cubo');
    for (let i = 0; i < 10; i++) {
      const ang = (i / 10) * Math.PI * 2;
      cilindro(0.04, 0.05, face + lado * 0.04, Math.sin(ang) * 0.115, Math.cos(ang) * 0.115, M.cinza, 'x', giro, 6, 'porca');
    }
    for (let i = 0; i < 8; i++) {                                        // furos do aro
      const ang = (i / 8) * Math.PI * 2 + 0.2;
      cilindro(0.085, 0.06, face - lado * 0.035, Math.sin(ang) * 0.24, Math.cos(ang) * 0.24, M.pretoFosco, 'x', giro, 10, 'furo');
    }
    giros.push(giro);
    if (dianteira) rodasDianteiras.push({ pivo, fator: z > 3 ? 1 : 0.65 }); // 2º eixo vira menos
  };
  for (const z of MEDIDAS.eixos) espelhar((s) => roda(s, z, z > 0));
  // para-lamas traseiros
  espelhar((s) => caixa(0.72, 0.06, 2.3, s * 0.95, 1.22, -3.02, M.preto));

  // ======== animação da caçamba ========
  let anguloCacamba = 0;
  const atualizarPistao = () => {
    const topo = B.Vector3.TransformCoordinates(pontoNaCacamba, cacPivo.computeWorldMatrix(true)
      .multiply(B.Matrix.Invert(raiz.computeWorldMatrix(true))));
    const dir = topo.subtract(pistaoBase);
    const comp = dir.length();
    const meio = pistaoBase.add(dir.scale(0.5));
    const giro = B.Quaternion.FromUnitVectorsToRef(B.Vector3.Up(), dir.normalizeToNew(), new B.Quaternion());
    pistao.rotationQuaternion = giro;
    pistao.position.copyFrom(meio);
    pistao.scaling.y = comp;
    pistaoCamisa.rotationQuaternion = giro.clone();
    pistaoCamisa.position.copyFrom(pistaoBase.add(dir.normalizeToNew().scale(0.35)));
    pistao.isVisible = pistaoCamisa.isVisible = anguloCacamba > 0.01;
  };

  const modelo = {
    raiz,
    partes,
    materiais: M,
    giros,
    rodasDianteiras,
    pneus,
    aros,
    raioRoda: R,
    // 0 = abaixada, 1 = toda levantada (~48 graus)
    definirCacamba(fracao) {
      anguloCacamba = Math.max(0, Math.min(1, fracao)) * 0.84;
      cacPivo.rotation.x = -anguloCacamba;
      atualizarPistao();
    },
    get cacamba() { return anguloCacamba / 0.84; },
    // reflexo do ambiente (uma textura cúbica do céu): deixa pintura, vidro e aros mais reais
    definirReflexo(textura) {
      // borda: reflexo visto de lado (rasante); frente: reflexo visto de frente
      const usar = (m, borda, frente) => {
        m.reflectionTexture = textura;
        const f = new B.FresnelParameters();
        f.bias = 0.05; f.power = 2.2;
        f.leftColor = new B.Color3(borda, borda, borda);
        f.rightColor = new B.Color3(frente, frente, frente);
        m.reflectionFresnelParameters = f;
      };
      usar(M.pinturaCabine, 0.6, 0.06);
      usar(M.pinturaCacamba, 0.4, 0.04);
      usar(M.preto, 0.35, 0.04);
      usar(M.vidro, 0.9, 0.3);
      usar(M.prata, 0.75, 0.45);
      usar(M.tanque, 0.6, 0.3);
    },
    definirCor(hex) {
      M.pinturaCabine.diffuseColor = B.Color3.FromHexString(hex);
      M.pinturaCacamba.diffuseColor = B.Color3.FromHexString(hex);
    },
    farois(ligados) {
      M.farol.emissiveColor = B.Color3.FromHexString(ligados ? '#fff3c4' : '#3a382f');
      M.lanterna.emissiveColor = B.Color3.FromHexString(ligados ? '#ff2a2a' : '#3a0405');
    },
    // anima as rodas: distância andada (m) e posição do volante (-1 a 1)
    animarRodas(distancia, volante) {
      for (const g of giros) g.rotation.x += distancia / R;
      for (const r of rodasDianteiras) r.pivo.rotation.y = volante * 0.5 * r.fator;
    },
  };
  modelo.definirCacamba(0);
  return modelo;
}

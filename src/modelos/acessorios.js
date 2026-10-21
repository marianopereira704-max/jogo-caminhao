// Acessórios que liga e desliga na garagem.
// Coordenadas no "corpo" do caminhão (frente = +z, direita = +x, chão = y 0 com a roda padrão).
const B = window.BABYLON;

export const TIPOS_ACESSORIO = ['giroflex', 'farois', 'quebramato', 'lameiros', 'bandeirinhas'];

function mat(scene, nome, cor, brilho = 0.3, emissivo = null) {
  const m = new B.StandardMaterial(nome, scene);
  m.diffuseColor = B.Color3.FromHexString(cor);
  m.specularColor = new B.Color3(brilho, brilho, brilho);
  if (emissivo) m.emissiveColor = B.Color3.FromHexString(emissivo);
  return m;
}

// ctx: { scene, corpo, cacPivo, M (materiais do caminhão), partes (lista para sombras) }
export function montarAcessorios(ctx) {
  const { scene, corpo, cacPivo, M } = ctx;
  const A = {
    ambar: mat(scene, 'a-ambar', '#ffae1a', 0.8, '#5a3000'),
    cromo: mat(scene, 'a-cromo', '#c3c9ce', 1.0),
    borracha: mat(scene, 'a-borracha', '#151515', 0.05),
  };
  const grupos = {};
  const novo = (id) => {
    const g = new B.TransformNode('acessorio-' + id, scene);
    g.parent = corpo;
    g.setEnabled(false);
    grupos[id] = g;
    return g;
  };
  const caixa = (g, w, h, d, x, y, z, m) => {
    const p = B.MeshBuilder.CreateBox('a', { width: w, height: h, depth: d }, scene);
    p.position.set(x, y, z); p.material = m; p.parent = g; ctx.partes.push(p); return p;
  };
  const tubo = (g, diam, comp, x, y, z, m, eixo = 'x', lados = 12) => {
    const p = B.MeshBuilder.CreateCylinder('a', { diameter: diam, height: comp, tessellation: lados }, scene);
    if (eixo === 'x') p.rotation.z = Math.PI / 2;
    if (eixo === 'z') p.rotation.x = Math.PI / 2;
    p.position.set(x, y, z); p.material = m; p.parent = g; ctx.partes.push(p); return p;
  };

  const teto = 3.38;

  // ===== Giroflex: barra no teto com dois sinalizadores âmbar que giram =====
  const gir = novo('giroflex');
  caixa(gir, 1.5, 0.08, 0.26, 0, teto + 0.04, 3.5, M.preto);
  const espelhos = [];
  for (const x of [-0.58, 0.58]) {
    tubo(gir, 0.24, 0.06, x, teto + 0.11, 3.5, M.preto, 'y');
    const cupula = tubo(gir, 0.22, 0.2, x, teto + 0.24, 3.5, A.ambar, 'y', 16);
    cupula.material = A.ambar;
    const esp = new B.TransformNode('espelho', scene);
    esp.parent = gir; esp.position.set(x, teto + 0.24, 3.5);
    const e = B.MeshBuilder.CreateBox('a', { width: 0.03, height: 0.14, depth: 0.16 }, scene);
    e.material = A.cromo; e.parent = esp; e.position.x = 0.04;
    espelhos.push(esp);
  }

  // ===== Faróis auxiliares no teto =====
  const far = novo('farois');
  tubo(far, 0.06, 2.1, 0, teto + 0.12, 4.9, M.preto);
  for (const x of [-0.85, 0.85]) caixa(far, 0.05, 0.14, 0.05, x, teto + 0.05, 4.9, M.preto);
  for (const x of [-0.75, -0.25, 0.25, 0.75]) {
    tubo(far, 0.2, 0.14, x, teto + 0.12, 5.0, M.preto, 'z', 18);
    tubo(far, 0.16, 0.02, x, teto + 0.12, 5.08, M.farol, 'z', 18);
  }

  // ===== Quebra-mato: grade tubular cromada na frente =====
  const qm = novo('quebramato');
  for (const x of [-1.0, 1.0]) tubo(qm, 0.09, 1.3, x, 1.25, 5.48, A.cromo, 'y');
  tubo(qm, 0.09, 2.0, 0, 1.9, 5.48, A.cromo);
  tubo(qm, 0.08, 2.0, 0, 1.4, 5.5, A.cromo);
  for (const x of [-0.45, 0, 0.45]) tubo(qm, 0.06, 0.5, x, 1.65, 5.49, A.cromo, 'y');
  for (const x of [-0.8, 0.8]) tubo(qm, 0.07, 0.28, x, 0.85, 5.36, A.cromo, 'z');

  // ===== Lameiros com franja atrás das rodas traseiras =====
  const lam = novo('lameiros');
  for (const s of [-1, 1]) {
    const x = s * 0.93;
    caixa(lam, 0.66, 0.06, 0.06, x, 0.98, -4.42, A.cromo);           // barra cromada
    caixa(lam, 0.64, 0.5, 0.02, x, 0.7, -4.42, A.borracha);         // borracha
    caixa(lam, 0.5, 0.08, 0.025, x, 0.78, -4.43, M.refletivo);       // faixa refletiva
    for (let i = 0; i < 9; i++) {                                    // franjas
      caixa(lam, 0.05, 0.16, 0.015, x - 0.28 + i * 0.07, 0.37, -4.42, i % 2 ? M.refletivo : A.borracha);
    }
  }

  // ===== Bandeirinhas: varal colorido no alto da caçamba (sobe junto com ela) =====
  const band = new B.TransformNode('acessorio-bandeirinhas', scene);
  band.parent = cacPivo;
  band.setEnabled(false);
  grupos.bandeirinhas = band;
  const coresBand = ['#e63b2e', '#f5c518', '#2f9e44', '#1f6fd1', '#f07a1a', '#ffffff'];
  const mBand = coresBand.map((c, i) => {
    const m = mat(scene, 'band' + i, c, 0.1);
    m.backFaceCulling = false;
    return m;
  });
  // triângulo com a ponta para baixo (plano YZ, vira de lado para fora da caçamba)
  const triangulo = () => {
    const m = new B.Mesh('band', scene);
    const d = new B.VertexData();
    d.positions = [0, 0, -0.12, 0, 0, 0.12, 0, -0.24, 0];
    d.indices = [0, 1, 2];
    d.normals = [1, 0, 0, 1, 0, 0, 1, 0, 0];
    d.applyToMesh(m);
    return m;
  };
  const alturaVaral = 1.5;
  for (const s of [-1, 1]) {
    const pontos = [];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24;
      pontos.push(new B.Vector3(s * 1.34, alturaVaral - Math.sin(t * Math.PI * 3) ** 2 * 0.1, 0.3 + t * 6.2));
    }
    const fio = B.MeshBuilder.CreateTube('fio', { path: pontos, radius: 0.008, tessellation: 4 }, scene);
    fio.material = M.preto; fio.parent = band;
    for (let i = 0; i < 24; i++) {
      const p = pontos[i];
      const tri = triangulo();
      tri.position.set(p.x + s * 0.01, p.y, p.z + 0.13);
      tri.material = mBand[i % mBand.length];
      tri.parent = band;
      ctx.partes.push(tri);
    }
  }

  let tempo = 0;
  return {
    definir(lista) {
      for (const id of TIPOS_ACESSORIO) grupos[id].setEnabled(lista.includes(id));
    },
    atualizar(dt, velocidade = 0) {
      tempo += dt;
      if (grupos.giroflex.isEnabled()) {
        for (const e of espelhos) e.rotation.y += dt * 9;
        const pulso = 0.5 + 0.5 * Math.max(0, Math.sin(tempo * 9));
        A.ambar.emissiveColor.set(0.35 + pulso * 0.65, 0.18 + pulso * 0.42, 0.0);
      }
      if (grupos.bandeirinhas.isEnabled()) {
        // balançam com o vento, mais forte com velocidade
        const forca = 0.12 + Math.min(Math.abs(velocidade), 13) * 0.03;
        let i = 0;
        for (const f of grupos.bandeirinhas.getChildMeshes(true)) {
          if (f.name !== 'band') continue;
          f.rotation.z = Math.sin(tempo * 6 + i) * forca * 0.6; // balança para fora e para dentro
          i++;
        }
      }
    },
  };
}

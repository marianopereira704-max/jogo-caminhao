// Formas que o Babylon não tem prontas, usadas para os modelos não parecerem "de bloquinho".
const B = window.BABYLON;

// Caixa com todas as bordas e cantos arredondados (raio r).
// Truque: uma esfera de raio r cortada em 8 pedaços, cada pedaço empurrado para um canto.
export function caixaArredondada(nome, larg, alt, prof, r, scene, passos = 3) {
  const hx = larg / 2, hy = alt / 2, hz = prof / 2;
  r = Math.max(0.001, Math.min(r, hx, hy, hz));
  const ox = hx - r, oy = hy - r, oz = hz - r;

  // latitudes: hemisfério de baixo e de cima (o equador aparece duas vezes)
  const lats = [];
  for (let k = 0; k <= passos; k++) lats.push({ a: -Math.PI / 2 + (Math.PI / 2) * (k / passos), s: -1 });
  for (let k = 0; k <= passos; k++) lats.push({ a: (Math.PI / 2) * (k / passos), s: 1 });
  // longitudes: 4 quadrantes (cada borda entre quadrantes aparece duas vezes)
  const lons = [];
  for (let q = 0; q < 4; q++) {
    const meio = (q + 0.5) * (Math.PI / 2);
    const sx = Math.sign(Math.cos(meio)), sz = Math.sign(Math.sin(meio));
    for (let k = 0; k <= passos; k++) lons.push({ a: q * (Math.PI / 2) + (Math.PI / 2) * (k / passos), sx, sz });
  }

  const pos = [], nor = [], idx = [];
  for (const la of lats) {
    for (const lo of lons) {
      const nx = Math.cos(la.a) * Math.cos(lo.a);
      const ny = Math.sin(la.a);
      const nz = Math.cos(la.a) * Math.sin(lo.a);
      pos.push(nx * r + lo.sx * ox, ny * r + la.s * oy, nz * r + lo.sz * oz);
      nor.push(nx, ny, nz);
    }
  }
  const colunas = lons.length;
  for (let i = 0; i < lats.length - 1; i++) {
    for (let j = 0; j < colunas; j++) {
      const j2 = (j + 1) % colunas;
      const a = i * colunas + j, b = i * colunas + j2;
      const c = (i + 1) * colunas + j, d = (i + 1) * colunas + j2;
      idx.push(a, b, c, b, d, c);
    }
  }
  // tampa de cima e de baixo (o retângulo entre os 4 cantos)
  for (const i of [0, lats.length - 1]) {
    const q = [0, 1, 2, 3].map((n) => i * colunas + n * (passos + 1));
    idx.push(q[0], q[1], q[2], q[0], q[2], q[3]);
    idx.push(q[0], q[2], q[1], q[0], q[3], q[2]);
  }
  const malha = new B.Mesh(nome, scene);
  const dados = new B.VertexData();
  dados.positions = pos;
  dados.normals = nor;
  dados.indices = idx;
  dados.applyToMesh(malha);
  return malha;
}

// Pneu com perfil de verdade: banda de rodagem reta, ombros arredondados e flanco abaulado.
// Sai com o eixo em X (pronto para ser roda).
export function pneu(nome, raio, largura, scene) {
  const w = largura / 2, ri = raio * 0.62;
  const perfil = [
    [ri, -w * 0.82], [raio * 0.78, -w * 0.98], [raio * 0.9, -w], [raio * 0.97, -w * 0.9],
    [raio, -w * 0.72], [raio, w * 0.72], [raio * 0.97, w * 0.9], [raio * 0.9, w],
    [raio * 0.78, w * 0.98], [ri, w * 0.82],
  ].map(([x, y]) => new B.Vector3(x, y, 0));
  const p = B.MeshBuilder.CreateLathe(nome, { shape: perfil, tessellation: 32, closed: true, cap: B.Mesh.NO_CAP }, scene);
  p.rotation.z = Math.PI / 2;
  return p;
}

// Aro de alumínio em forma de prato. lado = -1 ou 1 (para que lado o prato olha).
export function aro(nome, raio, lado, scene) {
  const perfil = [
    [0.0, 0.06], [0.16, 0.06], [0.2, 0.03], [raio * 0.62, -0.03],
    [raio * 0.82, -0.02], [raio * 0.9, 0.02], [raio * 0.94, 0.0],
  ].map(([x, y]) => new B.Vector3(x, y * lado, 0));
  const a = B.MeshBuilder.CreateLathe(nome, { shape: perfil, tessellation: 32, sideOrientation: B.Mesh.DOUBLESIDE }, scene);
  a.rotation.z = -Math.PI / 2;
  return a;
}

// Junta os filhos diretos de um nó em UMA malha por material (menos chamadas de desenho).
// Mantém a posição: as peças são juntadas no espaço do mundo e depois presas de volta no nó.
// Peças que se mexem sozinhas (pistão, placas de pintura, etc.) ficam de fora por nome.
const NAO_JUNTAR = new Set(['pistao', 'pistao-camisa', 'padrao', 'emissor']);
export function juntarPorMaterial(no) {
  const filhos = no.getChildMeshes(true).filter((m) =>
    m.material && !(m instanceof B.InstancedMesh) && !NAO_JUNTAR.has(m.name) && m.getTotalVertices() > 0);
  const grupos = new Map();
  for (const m of filhos) {
    if (!grupos.has(m.material)) grupos.set(m.material, []);
    grupos.get(m.material).push(m);
  }
  no.computeWorldMatrix(true);
  const resultado = [];
  for (const [material, lista] of grupos) {
    if (lista.length < 2) { resultado.push(...lista); continue; }
    for (const m of lista) {
      m.computeWorldMatrix(true);
      // todas as peças precisam ter os mesmos dados (posição, normal, UV) para juntar
      if (!m.isVerticesDataPresent(B.VertexBuffer.UVKind)) m.setVerticesData(B.VertexBuffer.UVKind, new Float32Array(m.getTotalVertices() * 2));
      for (const k of [B.VertexBuffer.ColorKind, B.VertexBuffer.UV2Kind, B.VertexBuffer.TangentKind]) if (m.isVerticesDataPresent(k)) m.removeVerticesData(k);
    }
    const u = B.Mesh.MergeMeshes(lista, true, true, undefined, false, false);
    if (!u) { resultado.push(...lista); continue; }
    u.material = material;
    u.setParent(no);
    resultado.push(u);
  }
  return resultado;
}

// Junta todas as malhas FIXAS de uma cena por material (usado no mapa, depois de montado).
// Instâncias (árvores, postes) já são desenhadas em lote e ficam de fora.
export function juntarCenaPorMaterial(scene, { ignorar = () => false, sombras = null, projetamSombra = new Set() } = {}) {
  const grupos = new Map();
  for (const m of scene.meshes) {
    if (!m.material || m instanceof B.InstancedMesh || !m.isVisible || m.infiniteDistance || ignorar(m)) continue;
    if (m.hasInstances || m.getTotalVertices() === 0) continue;
    if (!grupos.has(m.material)) grupos.set(m.material, []);
    grupos.get(m.material).push(m);
  }
  let antes = 0, depois = 0;
  for (const [material, lista] of grupos) {
    antes += lista.length;
    let final = lista;
    if (lista.length > 1) {
      for (const m of lista) {
        m.computeWorldMatrix(true);
        if (!m.isVerticesDataPresent(B.VertexBuffer.UVKind)) m.setVerticesData(B.VertexBuffer.UVKind, new Float32Array(m.getTotalVertices() * 2));
        for (const k of [B.VertexBuffer.ColorKind, B.VertexBuffer.UV2Kind, B.VertexBuffer.TangentKind]) if (m.isVerticesDataPresent(k)) m.removeVerticesData(k);
      }
      const recebe = lista.some((m) => m.receiveShadows);
      const u = B.Mesh.MergeMeshes(lista, true, true, undefined, false, false);
      if (u) { u.material = material; u.receiveShadows = recebe; u.freezeWorldMatrix(); final = [u]; }
    }
    depois += final.length;
    if (sombras && projetamSombra.has(material)) for (const m of final) sombras.addShadowCaster(m);
  }
  return { antes, depois };
}

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

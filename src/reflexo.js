// Tira uma "foto" do ambiente em volta (uma vez só) para a pintura e o vidro refletirem.
const B = window.BABYLON;

export function criarReflexo(scene, malhas, posicao = new B.Vector3(0, 2, 0)) {
  const sonda = new B.ReflectionProbe('sonda-' + scene.uid, 128, scene);
  for (const m of malhas) sonda.renderList.push(m);
  sonda.position = posicao;
  sonda.refreshRate = B.RenderTargetTexture.REFRESHRATE_RENDER_ONCE;
  return sonda.cubeTexture;
}

// Céu em degradê numa esfera grande (fica bonito e também é refletido).
export function criarCeu(scene, cores = ['#aeb6bc', '#d5dde2', '#cfe6f6', '#5f9fd8']) {
  const ceu = B.MeshBuilder.CreateSphere('ceu', { diameter: 900, segments: 16, sideOrientation: B.Mesh.BACKSIDE }, scene);
  const tex = new B.DynamicTexture('tex-ceu', { width: 8, height: 256 }, scene, false);
  const ctx = tex.getContext();
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, cores[0]); g.addColorStop(0.48, cores[1]); g.addColorStop(0.52, cores[2]); g.addColorStop(1, cores[3]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, 8, 256); tex.update();
  const m = new B.StandardMaterial('mat-ceu', scene);
  m.emissiveTexture = tex; m.disableLighting = true; m.backFaceCulling = false; m.fogEnabled = false;
  ceu.material = m;
  ceu.infiniteDistance = true;
  ceu.isPickable = false;
  return ceu;
}

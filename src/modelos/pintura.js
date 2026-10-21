// Padrões de pintura aplicados nas laterais da caçamba, por cima da cor escolhida.
const B = window.BABYLON;

export const TIPOS_PADRAO = ['liso', 'bolinhas', 'estrelas', 'listras', 'chamas'];

// cor do desenho: escura em pintura clara, branca em pintura escura/colorida
function corDoDesenho(hex) {
  const c = B.Color3.FromHexString(hex);
  const luz = 0.299 * c.r + 0.587 * c.g + 0.114 * c.b;
  return luz > 0.7 ? 'rgba(35,38,42,0.92)' : 'rgba(255,255,255,0.95)';
}

function estrela(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5;
    const rr = i % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
}

// Desenha o padrão numa textura W x H (a frente do caminhão fica em x = 0)
function desenhar(ctx, W, H, padrao, corBase) {
  ctx.clearRect(0, 0, W, H);
  const tinta = corDoDesenho(corBase);
  ctx.fillStyle = tinta;
  ctx.strokeStyle = tinta;
  switch (padrao) {
    case 'bolinhas': {
      const passo = H / 3;
      for (let fila = 0; fila < 4; fila++) {
        for (let x = (fila % 2) * passo / 2; x < W + passo; x += passo) {
          ctx.beginPath();
          ctx.arc(x, fila * passo + passo * 0.2, passo * 0.22, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    }
    case 'estrelas': {
      const passo = H / 2.2;
      let k = 0;
      for (let x = passo * 0.6; x < W; x += passo) {
        const y = k % 2 ? H * 0.32 : H * 0.68;
        estrela(ctx, x, y, passo * (k % 3 === 0 ? 0.36 : 0.26));
        k++;
      }
      break;
    }
    case 'listras': {
      // faixa dupla de corrida, inclinada na frente
      for (const [y, h] of [[H * 0.3, H * 0.16], [H * 0.56, H * 0.08]]) {
        ctx.beginPath();
        ctx.moveTo(H * 0.35, y); ctx.lineTo(W, y); ctx.lineTo(W, y + h); ctx.lineTo(H * 0.35 + h * 1.4, y + h);
        ctx.closePath(); ctx.fill();
      }
      break;
    }
    case 'chamas': {
      // chamas saindo da frente para trás, em degradê de fogo com contorno escuro
      const g = ctx.createLinearGradient(0, 0, W * 0.6, 0);
      g.addColorStop(0, '#fff3a0'); g.addColorStop(0.25, '#ffc21a'); g.addColorStop(0.6, '#ff6a00'); g.addColorStop(1, '#d1170d');
      ctx.beginPath();
      ctx.moveTo(0, H * 0.15);
      const linguas = 6;
      for (let i = 0; i < linguas; i++) {
        const y0 = H * (0.15 + (i / linguas) * 0.7);
        const y1 = H * (0.15 + ((i + 0.5) / linguas) * 0.7);
        const y2 = H * (0.15 + ((i + 1) / linguas) * 0.7);
        const comp = W * (0.38 + ((i * 37) % 23) / 100);
        ctx.quadraticCurveTo(comp * 0.6, y0 - H * 0.08, comp, y1);
        ctx.quadraticCurveTo(comp * 0.55, y2 + H * 0.02, W * 0.08, y2);
      }
      ctx.lineTo(0, H * 0.85);
      ctx.closePath();
      ctx.fillStyle = g;
      ctx.fill();
      ctx.lineWidth = H * 0.025;
      ctx.strokeStyle = 'rgba(60,10,0,.85)';
      ctx.stroke();
      break;
    }
    default: break;
  }
}

// ctx: { scene, cacPivo, larg (meia largura), comp, alt, base }
export function montarPintura({ scene, cacPivo, meiaLargura, comprimento, altura, base }) {
  const W = 1024, H = 192;
  const tex = new B.DynamicTexture('tex-padrao', { width: W, height: H }, scene, true);
  tex.hasAlpha = true;
  const m = new B.StandardMaterial('mat-padrao', scene);
  m.diffuseTexture = tex;
  m.useAlphaFromDiffuseTexture = true;
  m.specularColor = new B.Color3(0.25, 0.25, 0.25);
  m.zOffset = -2;
  m.backFaceCulling = false;
  const placas = [];
  for (const s of [-1, 1]) {
    const p = B.MeshBuilder.CreatePlane('padrao', { width: comprimento, height: altura }, scene);
    p.parent = cacPivo;
    p.position.set(s * meiaLargura, base + altura / 2, comprimento / 2);
    p.rotation.y = s < 0 ? Math.PI / 2 : -Math.PI / 2;
    // espelha a textura de um lado para a frente do desenho ficar sempre na frente do caminhão
    if (s > 0) p.scaling.x = -1;
    p.material = m;
    p.isPickable = false;
    placas.push(p);
  }
  let atual = 'liso', cor = '#f4f5f2';
  const aplicar = () => {
    desenhar(tex.getContext(), W, H, atual, cor);
    tex.update();
    for (const p of placas) p.setEnabled(atual !== 'liso');
  };
  aplicar();
  return {
    definir(padrao, corBase) {
      atual = padrao || 'liso';
      cor = corBase || cor;
      aplicar();
    },
  };
}

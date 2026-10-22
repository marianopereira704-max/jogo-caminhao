// Texturas desenhadas por código para a cidade: asfalto, calçada, areia, mar,
// fachadas de prédio, letreiros e placas no padrão brasileiro.
const B = window.BABYLON;

let semente = 12345;
const rnd = () => { semente = (semente * 16807) % 2147483647; return (semente - 1) / 2147483646; };

function tex(scene, nome, w, h, desenhar, opcoes = {}) {
  const t = new B.DynamicTexture(nome, { width: w, height: h }, scene, opcoes.mipmaps ?? true);
  const c = t.getContext();
  desenhar(c, w, h);
  t.update();
  t.anisotropicFilteringLevel = 8;
  t.wrapU = t.wrapV = B.Texture.WRAP_ADDRESSMODE;
  if (opcoes.alfa) t.hasAlpha = true;
  return t;
}

const granulado = (c, w, h, n, cores, tam = [1, 3]) => {
  for (let i = 0; i < n; i++) {
    c.fillStyle = cores[Math.floor(rnd() * cores.length)];
    const s = tam[0] + rnd() * (tam[1] - tam[0]);
    c.fillRect(rnd() * w, rnd() * h, s, s);
  }
};

export const texAsfalto = (scene) => tex(scene, 'asfalto', 512, 512, (c, w, h) => {
  c.fillStyle = '#4a4c50'; c.fillRect(0, 0, w, h);
  granulado(c, w, h, 9000, ['rgba(0,0,0,.18)', 'rgba(255,255,255,.08)', 'rgba(90,90,95,.4)']);
  for (let i = 0; i < 6; i++) { c.fillStyle = 'rgba(0,0,0,.06)'; c.beginPath(); c.ellipse(rnd() * w, rnd() * h, 40 + rnd() * 80, 20 + rnd() * 40, rnd() * 3, 0, 7); c.fill(); }
});

export const texCalcada = (scene) => tex(scene, 'calcada', 256, 256, (c, w, h) => {
  c.fillStyle = '#d6d2c8'; c.fillRect(0, 0, w, h);
  granulado(c, w, h, 1500, ['rgba(0,0,0,.06)', 'rgba(255,255,255,.1)']);
  c.strokeStyle = 'rgba(0,0,0,.14)'; c.lineWidth = 2;
  for (let x = 0; x <= w; x += 64) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); c.beginPath(); c.moveTo(0, x); c.lineTo(w, x); c.stroke(); }
});

export const texCalcadao = (scene) => tex(scene, 'calcadao', 256, 256, (c, w, h) => {
  // ladrilho claro em ondas suaves, lembrando os calçadões de orla
  c.fillStyle = '#e4dccb'; c.fillRect(0, 0, w, h);
  c.strokeStyle = 'rgba(150,120,90,.35)'; c.lineWidth = 10;
  for (let y = -32; y < h + 32; y += 64) {
    c.beginPath();
    for (let x = 0; x <= w; x += 8) c.lineTo(x, y + Math.sin((x / w) * Math.PI * 2) * 14);
    c.stroke();
  }
  granulado(c, w, h, 800, ['rgba(0,0,0,.05)', 'rgba(255,255,255,.12)']);
});

export const texAreia = (scene) => tex(scene, 'areia', 256, 256, (c, w, h) => {
  c.fillStyle = '#e7d4a2'; c.fillRect(0, 0, w, h);
  granulado(c, w, h, 6000, ['rgba(160,130,80,.25)', 'rgba(255,255,255,.3)', 'rgba(120,100,60,.15)'], [1, 2]);
});

export const texGrama = (scene) => tex(scene, 'grama', 256, 256, (c, w, h) => {
  c.fillStyle = '#6a9a48'; c.fillRect(0, 0, w, h);
  granulado(c, w, h, 5000, ['rgba(40,80,20,.3)', 'rgba(150,190,90,.3)', 'rgba(90,130,50,.4)'], [1, 3]);
});

export const texMar = (scene) => tex(scene, 'mar', 512, 512, (c, w, h) => {
  c.fillStyle = '#2f7fa8'; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 260; i++) {
    c.strokeStyle = rnd() < 0.5 ? 'rgba(255,255,255,.12)' : 'rgba(10,50,80,.18)';
    c.lineWidth = 1 + rnd() * 2;
    const x = rnd() * w, y = rnd() * h, l = 10 + rnd() * 30;
    c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + l / 2, y - 3, x + l, y); c.stroke();
  }
});

// fachada de prédio residencial: varandas + vidro, em faixas de andares
export function texFachada(scene, variante) {
  const estilos = [
    { parede: '#e8e4dc', vidro: '#5d7f99', varanda: '#f6f4ef', guarda: 'rgba(120,170,200,.55)' },
    { parede: '#cfd6dc', vidro: '#3f5e78', varanda: '#e9edf0', guarda: 'rgba(200,220,235,.6)' },
    { parede: '#e9dccb', vidro: '#6a7f8e', varanda: '#f3ebe0', guarda: 'rgba(240,240,240,.5)' },
    { parede: '#9fb4c4', vidro: '#2c4a63', varanda: '#c9d6e0', guarda: 'rgba(160,200,230,.5)' },
  ];
  const e = estilos[variante % estilos.length];
  return tex(scene, 'fachada' + variante, 256, 256, (c, w, h) => {
    const andares = 4, vaos = 4;
    const ah = h / andares, vw = w / vaos;
    c.fillStyle = e.parede; c.fillRect(0, 0, w, h);
    for (let a = 0; a < andares; a++) {
      const y = a * ah;
      for (let v = 0; v < vaos; v++) {
        const x = v * vw;
        c.fillStyle = e.vidro; c.fillRect(x + 6, y + 8, vw - 12, ah - 22);
        c.fillStyle = 'rgba(255,255,255,.18)'; c.fillRect(x + 8, y + 10, (vw - 16) * 0.35, ah - 26);
      }
      c.fillStyle = e.varanda; c.fillRect(0, y + ah - 14, w, 14);       // laje da varanda
      c.fillStyle = e.guarda; c.fillRect(0, y + ah - 30, w, 16);         // guarda-corpo de vidro
    }
  });
}

// fachada de loja de rua: parede colorida, porta de vidro, toldo e letreiro
export function texLoja(scene, nome, cor, desenhoExtra) {
  return tex(scene, 'loja-' + nome, 512, 256, (c, w, h) => {
    c.fillStyle = cor; c.fillRect(0, 0, w, h);
    granulado(c, w, h, 800, ['rgba(0,0,0,.05)', 'rgba(255,255,255,.08)']);
    // janelas do andar de cima
    c.fillStyle = '#5d7488';
    for (let x = 40; x < w - 60; x += 110) c.fillRect(x, 18, 70, 50);
    // letreiro
    c.fillStyle = '#ffffff'; c.fillRect(30, 84, w - 60, 54);
    c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 4; c.strokeRect(30, 84, w - 60, 54);
    c.fillStyle = '#1f2a36';
    c.font = 'bold 34px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(nome, w / 2, 112);
    // vitrine e porta
    c.fillStyle = '#6e8ea6'; c.fillRect(30, 150, w - 60, h - 150);
    c.fillStyle = 'rgba(255,255,255,.2)'; c.fillRect(40, 158, 90, h - 166);
    c.fillStyle = '#3d4e5c'; c.fillRect(w / 2 - 40, 160, 80, h - 160);
    if (desenhoExtra) desenhoExtra(c, w, h);
  });
}

// desenhos originais para a Loja do Rael: dinossauro, carrinho e cachorro azul
export function desenhosRael(c, w) {
  const verde = '#3fae4b', azul = '#3f8fe0';
  // dinossauro (pescoço longo, simpático)
  c.save(); c.translate(70, 205); c.fillStyle = verde;
  c.beginPath(); c.ellipse(0, 10, 34, 20, 0, 0, 7); c.fill();
  c.fillRect(14, -40, 12, 48); c.beginPath(); c.ellipse(26, -42, 16, 10, 0, 0, 7); c.fill();
  c.beginPath(); c.moveTo(-30, 8); c.lineTo(-60, 0); c.lineTo(-30, 20); c.fill();
  c.fillRect(-20, 24, 9, 16); c.fillRect(12, 24, 9, 16);
  c.fillStyle = '#fff'; c.beginPath(); c.arc(32, -45, 3.5, 0, 7); c.fill();
  c.restore();
  // carrinho vermelho
  c.save(); c.translate(w - 110, 210);
  c.fillStyle = '#e23b2e'; c.fillRect(-40, -10, 80, 22); c.fillRect(-22, -28, 42, 20);
  c.fillStyle = '#bfe3ff'; c.fillRect(-16, -24, 14, 12); c.fillRect(2, -24, 14, 12);
  c.fillStyle = '#1b1b1b'; c.beginPath(); c.arc(-22, 14, 10, 0, 7); c.arc(22, 14, 10, 0, 7); c.fill();
  c.restore();
  // cachorro azul (original): cabeça redonda, orelhas caídas e língua
  c.save(); c.translate(w - 40, 175); c.fillStyle = azul;
  c.beginPath(); c.arc(0, 0, 22, 0, 7); c.fill();
  c.fillStyle = '#245f9c'; c.beginPath(); c.ellipse(-20, 4, 8, 15, 0.3, 0, 7); c.ellipse(20, 4, 8, 15, -0.3, 0, 7); c.fill();
  c.fillStyle = '#fff'; c.beginPath(); c.arc(-8, -4, 5, 0, 7); c.arc(8, -4, 5, 0, 7); c.fill();
  c.fillStyle = '#1b1b1b'; c.beginPath(); c.arc(-8, -4, 2.5, 0, 7); c.arc(8, -4, 2.5, 0, 7); c.arc(0, 6, 4, 0, 7); c.fill();
  c.fillStyle = '#ff7f9e'; c.fillRect(-3, 10, 6, 8);
  c.restore();
}

// placa azul de rua/bairro (padrão brasileiro)
export const texPlacaRua = (scene, texto) => tex(scene, 'placa-' + texto, 512, 128, (c, w, h) => {
  c.fillStyle = '#1f4f9c'; c.fillRect(0, 0, w, h);
  c.strokeStyle = '#ffffff'; c.lineWidth = 8; c.strokeRect(8, 8, w - 16, h - 16);
  c.fillStyle = '#ffffff'; c.font = 'bold 44px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(texto, w / 2, h / 2 + 2, w - 40);
});

// placas de trânsito CONTRAN
export const texPlacaPare = (scene) => tex(scene, 'placa-pare', 128, 128, (c, w) => {
  c.fillStyle = '#c4161c'; c.beginPath();
  for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + i * Math.PI / 4; c.lineTo(w / 2 + Math.cos(a) * 62, w / 2 + Math.sin(a) * 62); }
  c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 5; c.stroke();
  c.fillStyle = '#fff'; c.font = 'bold 38px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('PARE', w / 2, w / 2 + 2);
}, { alfa: true });

export const texPlacaVelocidade = (scene, valor) => tex(scene, 'placa-vel' + valor, 128, 128, (c, w) => {
  c.fillStyle = '#ffffff'; c.beginPath(); c.arc(w / 2, w / 2, 62, 0, 7); c.fill();
  c.strokeStyle = '#c4161c'; c.lineWidth = 14; c.beginPath(); c.arc(w / 2, w / 2, 54, 0, 7); c.stroke();
  c.fillStyle = '#111'; c.font = 'bold 44px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(valor), w / 2, w / 2 + 3);
  c.font = 'bold 14px sans-serif'; c.fillText('km/h', w / 2, w / 2 + 32);
}, { alfa: true });

export const texPlacaPedestre = (scene) => tex(scene, 'placa-ped', 128, 128, (c, w) => {
  c.fillStyle = '#f5c400'; c.beginPath(); c.moveTo(w / 2, 4); c.lineTo(w - 4, w / 2); c.lineTo(w / 2, w - 4); c.lineTo(4, w / 2); c.closePath(); c.fill();
  c.strokeStyle = '#111'; c.lineWidth = 4; c.stroke();
  c.fillStyle = '#111'; c.beginPath(); c.arc(64, 38, 8, 0, 7); c.fill();
  c.fillRect(58, 48, 12, 30); c.fillRect(48, 76, 10, 24); c.fillRect(70, 76, 10, 24); c.fillRect(44, 52, 40, 8);
}, { alfa: true });

export function texFaixaLinha(scene) { return tex(scene, 'faixa', 8, 8, (c) => { c.fillStyle = '#fff'; c.fillRect(0, 0, 8, 8); }, { mipmaps: false }); }

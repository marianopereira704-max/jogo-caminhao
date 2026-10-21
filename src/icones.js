// Ícones (SVG) da prateleira da garagem. Desenhos próprios, simples e legíveis para criança.
const svg = (corpo) => `<svg viewBox="0 0 100 100">${corpo}</svg>`;

const furos = (n, r, raio, cor, giro = 0) => Array.from({ length: n }, (_, i) => {
  const a = (i / n) * Math.PI * 2 + giro;
  return `<circle cx="${50 + Math.cos(a) * r}" cy="${50 + Math.sin(a) * r}" r="${raio}" fill="${cor}"/>`;
}).join('');
const raios = (n, r0, r1, cor, larg, giro = 0) => Array.from({ length: n }, (_, i) => {
  const a = (i / n) * Math.PI * 2 + giro;
  return `<line x1="${50 + Math.cos(a) * r0}" y1="${50 + Math.sin(a) * r0}" x2="${50 + Math.cos(a) * r1}" y2="${50 + Math.sin(a) * r1}" stroke="${cor}" stroke-width="${larg}" stroke-linecap="round"/>`;
}).join('');
const dentes = (n, r0, r1, cor) => {
  let d = '';
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2, a1 = ((i + 0.5) / n) * Math.PI * 2, a2 = ((i + 1) / n) * Math.PI * 2;
    const p = (a, r) => `${50 + Math.cos(a) * r},${50 + Math.sin(a) * r}`;
    d += `${p(a0, r1)} ${p(a0 + 0.06, r0)} ${p(a1 - 0.06, r0)} ${p(a1, r1)} ${p(a2, r1)} `;
  }
  return `<polygon points="${d}" fill="${cor}"/>`;
};

export const ICONES_RODA = {
  aluminio: svg(`<circle cx="50" cy="50" r="46" fill="#1d1d1f"/><circle cx="50" cy="50" r="29" fill="#d5d9dd"/>${furos(8, 19, 4.5, '#5d6166')}<circle cx="50" cy="50" r="10" fill="#9aa0a6"/>${furos(10, 6.5, 1.4, '#3b3e42')}`),
  madeira: svg(`<circle cx="50" cy="50" r="46" fill="#3a3b3f"/><circle cx="50" cy="50" r="40" fill="#9a6337"/><circle cx="50" cy="50" r="31" fill="#2b2620"/>${raios(10, 8, 33, '#a86c3c', 6)}<circle cx="50" cy="50" r="11" fill="#9a6337"/><circle cx="50" cy="50" r="5" fill="#3a3b3f"/>${furos(16, 43, 1.8, '#8a8c90')}`),
  engrenagem: svg(`${dentes(14, 47, 37, '#6a7178')}<circle cx="50" cy="50" r="36" fill="#6a7178"/><circle cx="50" cy="50" r="30" fill="#6236c0"/>${furos(6, 18, 6, '#2c2348')}<circle cx="50" cy="50" r="10" fill="#d0d5da"/><polygon points="50,38 54,50 50,62 46,50" fill="#ffffff"/>`),
  dourada: svg(`<circle cx="50" cy="50" r="46" fill="#1d1d1f"/><circle cx="50" cy="50" r="31" fill="#c48a12"/><circle cx="50" cy="50" r="26" fill="#2a2016"/>${raios(5, 8, 27, '#e0a81e', 5, -Math.PI / 2 - 0.12)}${raios(5, 8, 27, '#e0a81e', 5, -Math.PI / 2 + 0.12)}<circle cx="50" cy="50" r="9" fill="#e0a81e"/><circle cx="50" cy="50" r="4" fill="#111"/>`),
  fogo: svg(`<path d="M18 40 C10 22 28 18 26 4 C40 14 44 24 40 32 C46 20 58 18 56 2 C72 14 78 26 70 40 Z" fill="#ff7a12"/><path d="M28 40 C24 30 34 26 34 18 C42 26 44 32 42 38 C48 30 56 28 56 20 C64 28 64 36 60 42 Z" fill="#ffd23a"/><circle cx="50" cy="56" r="40" fill="#1d1d1f"/><circle cx="50" cy="56" r="27" fill="#ff5a00"/>${''}<g transform="translate(0,6)">${raios(6, 7, 24, '#141516', 6)}</g><circle cx="50" cy="56" r="7" fill="#141516"/>`),
  monstro: svg(`${dentes(18, 48, 41, '#151515')}<circle cx="50" cy="50" r="41" fill="#242424"/><circle cx="50" cy="50" r="25" fill="#c8201b"/><circle cx="50" cy="50" r="27" fill="none" stroke="#5a5d61" stroke-width="3"/>${furos(16, 21, 1.6, '#e8ecef')}<circle cx="50" cy="50" r="8" fill="#e8ecef"/>`),
};

export const ICONES_ACESSORIO = {
  giroflex: svg(`<rect x="22" y="62" width="56" height="10" rx="3" fill="#2a2c2e"/><path d="M34 62 v-14 a16 16 0 0 1 32 0 v14 z" fill="#ffae1a"/><rect x="42" y="44" width="6" height="16" rx="2" fill="#fff7d8" opacity=".9"/>${['M50 18 v-12', 'M24 30 l-9 -8', 'M76 30 l9 -8', 'M18 50 h-12', 'M82 50 h12'].map((d) => `<path d="${d}" stroke="#ffae1a" stroke-width="5" stroke-linecap="round"/>`).join('')}`),
  farois: svg(`<rect x="8" y="58" width="84" height="8" rx="4" fill="#2a2c2e"/>${[20, 40, 60, 80].map((x) => `<circle cx="${x}" cy="50" r="9" fill="#2a2c2e"/><circle cx="${x}" cy="50" r="6" fill="#fff3c4"/><path d="M${x} 36 v-14" stroke="#ffe48a" stroke-width="4" stroke-linecap="round"/>`).join('')}`),
  quebramato: svg(`<rect x="14" y="30" width="72" height="44" rx="10" fill="none" stroke="#b8bfc5" stroke-width="7"/><path d="M14 52 h72 M38 30 v22 M50 30 v22 M62 30 v22" stroke="#b8bfc5" stroke-width="5"/><path d="M28 74 v12 M72 74 v12" stroke="#b8bfc5" stroke-width="6" stroke-linecap="round"/>`),
  lameiros: svg(`<rect x="24" y="14" width="52" height="7" rx="2" fill="#c3c9ce"/><rect x="26" y="21" width="48" height="48" rx="3" fill="#1b1b1b"/><rect x="30" y="34" width="40" height="7" fill="#d9141b"/>${Array.from({ length: 8 }, (_, i) => `<rect x="${27 + i * 6}" y="69" width="4" height="16" fill="${i % 2 ? '#d9141b' : '#1b1b1b'}"/>`).join('')}`),
  bandeirinhas: svg(`<path d="M4 22 Q27 40 50 22 T96 22" fill="none" stroke="#2a2c2e" stroke-width="3"/>${[[12, '#e63b2e'], [26, '#f5c518'], [40, '#2f9e44'], [58, '#1f6fd1'], [72, '#f07a1a'], [86, '#ffffff']].map(([x, c]) => `<polygon points="${x - 7},${28 + Math.sin(x / 15) * 4} ${x + 7},${28 + Math.sin(x / 15) * 4} ${x},${50 + Math.sin(x / 15) * 4}" fill="${c}" stroke="#2a2c2e" stroke-width="1"/>`).join('')}<path d="M4 62 Q27 80 50 62 T96 62" fill="none" stroke="#2a2c2e" stroke-width="3"/>${[[12, '#2f9e44'], [26, '#ffffff'], [40, '#e63b2e'], [58, '#f5c518'], [72, '#1f6fd1'], [86, '#f07a1a']].map(([x, c]) => `<polygon points="${x - 7},${68 + Math.sin(x / 15) * 4} ${x + 7},${68 + Math.sin(x / 15) * 4} ${x},${90 + Math.sin(x / 15) * 4}" fill="${c}" stroke="#2a2c2e" stroke-width="1"/>`).join('')}`),
};

// latinha de spray com o padrão desenhado no rótulo
const spray = (rotulo) => svg(`<rect x="40" y="6" width="14" height="10" rx="2" fill="#d9141b"/><rect x="36" y="14" width="22" height="8" rx="2" fill="#cfd4d8"/><rect x="28" y="20" width="38" height="72" rx="10" fill="#e9edf0"/><clipPath id="c"><rect x="28" y="36" width="38" height="40"/></clipPath><rect x="28" y="36" width="38" height="40" fill="#d9141b"/><g clip-path="url(#c)">${rotulo}</g>`);
export const ICONES_PADRAO = {
  liso: svg(`<rect x="18" y="12" width="60" height="26" rx="6" fill="#d9141b"/><rect x="18" y="30" width="60" height="8" fill="#b30f15"/><path d="M48 38 v12" stroke="#7a7e83" stroke-width="5"/><rect x="42" y="48" width="12" height="42" rx="4" fill="#8a5a33"/><path d="M26 12 q4 -8 10 0" fill="#d9141b"/>`),
  bolinhas: spray(furos(6, 0, 0, '#fff') + [[36, 42], [52, 42], [44, 54], [60, 54], [36, 66], [52, 66]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4.5" fill="#fff"/>`).join('')),
  estrelas: spray(`<polygon points="47,40 50,48 58,48 52,53 54,61 47,56 40,61 42,53 36,48 44,48" fill="#fff"/><polygon points="38,64 39.5,68 44,68 40.5,70.5 42,75 38,72 34,75 35.5,70.5 32,68 36.5,68" fill="#fff"/><polygon points="58,62 59.5,66 64,66 60.5,68.5 62,73 58,70 54,73 55.5,68.5 52,66 56.5,66" fill="#fff"/>`),
  listras: spray(`<path d="M28 46 h38 v8 h-38 z M28 60 h38 v4 h-38 z" fill="#fff"/>`),
  chamas: spray(`<path d="M28 76 C30 62 38 64 36 50 C44 58 46 62 44 68 C50 58 56 58 54 44 C64 54 68 66 66 76 Z" fill="#ffc21a"/><path d="M34 76 C36 68 42 68 42 60 C48 66 48 70 46 74 C50 68 56 68 56 62 C62 68 62 72 60 76 Z" fill="#fff3a0"/>`),
};

export const ICONES_CATEGORIA = {
  pintura: svg(`<rect x="18" y="10" width="64" height="30" rx="8" fill="#f5b82e"/><path d="M50 40 v14" stroke="#cfd4d8" stroke-width="6"/><rect x="42" y="52" width="16" height="40" rx="6" fill="#8a5a33"/>`),
  rodas: ICONES_RODA.aluminio,
  acessorios: svg(`<polygon points="50,8 61,36 92,38 68,58 76,88 50,72 24,88 32,58 8,38 39,36" fill="#f5b82e"/>`),
};

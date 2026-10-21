// Guarda as preferências no próprio celular (localStorage).
// Se o navegador bloquear, o jogo continua funcionando, só não lembra.
const CHAVE = 'jogo-caminhao:v1';

const PADRAO = {
  modoDirecao: 'setas',      // 'setas' ou 'inclinacao'
  aceleradorAuto: false,
  cor: '#f4f5f2',             // pintura do caminhão
  roda: 'aluminio',          // modelo de roda (veja modelos/rodas.js)
};

export function carregar() {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE) || '{}');
    return { ...PADRAO, ...salvo };
  } catch {
    return { ...PADRAO };
  }
}

export function salvar(dados) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(dados));
  } catch {
    // sem armazenamento disponível: ignora
  }
}

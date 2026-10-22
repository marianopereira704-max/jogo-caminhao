// Números que definem a "sensação" do jogo. Mudar aqui muda o jogo inteiro.
export const CONFIG = {
  fps: 30,                    // limite de quadros por segundo (economiza bateria e calor)
  resolucaoMax: 3,            // multiplicador máximo de resolução (3 = nativa nos celulares atuais)
  resolucaoMin: 1.5,          // a qualidade automática nunca desce abaixo disso

  // Movimento do caminhão (metros e segundos)
  velMaxFrente: 16.7,         // 60 km/h
  velMaxRe: 4,                // ~14 km/h
  aceleracao: 3.6,            // quanto ganha de velocidade por segundo (0 a 60 em ~4,6 s)
  aceleracaoRe: 2.0,
  freio: 9.0,                 // quanto perde por segundo freando
  rolagem: 1.4,               // quanto perde por segundo soltando tudo
  giroMax: 0.85,              // velocidade máxima de giro (radianos por segundo)
  velGiroCheio: 5,            // a partir dessa velocidade, o giro é total
  suavizarDirecao: 3.5,       // quão rápido o volante chega na posição pedida

  // Inclinação do celular
  inclinacaoZonaMorta: 4,     // graus ignorados perto do centro
  inclinacaoMax: 25,          // graus para virar tudo

  // Paleta de pintura da garagem
  cores: ['#f4f5f2', '#d42a20', '#1f5fbf', '#f5c518', '#2f9e44', '#f07a1a', '#7b3fb5', '#2a2c2e'],

  // Mundo de teste
  limiteMundo: 185,           // paredes invisíveis (metros a partir do centro)
};

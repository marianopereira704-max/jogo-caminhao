// Números que definem a "sensação" do jogo. Mudar aqui muda o jogo inteiro.
export const CONFIG = {
  fps: 30,                    // limite de quadros por segundo (economiza bateria e calor)
  resolucaoMax: 1.75,         // multiplicador máximo de resolução da tela

  // Movimento do caminhão (metros e segundos)
  velMaxFrente: 13,           // ~47 km/h
  velMaxRe: 4,                // ~14 km/h
  aceleracao: 3.0,            // quanto ganha de velocidade por segundo
  aceleracaoRe: 2.0,
  freio: 9.0,                 // quanto perde por segundo freando
  rolagem: 1.4,               // quanto perde por segundo soltando tudo
  giroMax: 0.85,              // velocidade máxima de giro (radianos por segundo)
  velGiroCheio: 5,            // a partir dessa velocidade, o giro é total
  suavizarDirecao: 3.5,       // quão rápido o volante chega na posição pedida

  // Inclinação do celular
  inclinacaoZonaMorta: 4,     // graus ignorados perto do centro
  inclinacaoMax: 25,          // graus para virar tudo

  // Mundo de teste
  limiteMundo: 185,           // paredes invisíveis (metros a partir do centro)
};

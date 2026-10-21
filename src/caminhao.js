// O caminhão do jogo: a caçamba 8x4 aprovada + o movimento "no trilho"
// (sem física, sem tombar, sem derrapar).
import { CONFIG } from './config.js';
import { montarCacamba8x4, MEDIDAS } from './modelos/cacamba-8x4.js';

const B = window.BABYLON;

export class Caminhao {
  constructor(scene, sombras) {
    this.scene = scene;
    this.modelo = montarCacamba8x4(scene);
    this.raiz = this.modelo.raiz;
    this.modelo.usarSombras(sombras);

    this.velocidade = 0;          // m/s (negativo = ré)
    this.direcaoSuave = 0;        // posição atual do volante (-1 a 1)
    this.marcha = 'D';
    this.marchaPendente = null;   // marcha pedida enquanto ainda está andando
    this.encostado = false;
    this.alvoCacamba = 0;         // 0 = abaixada, 1 = levantada
  }

  get posicao() { return this.raiz.position; }
  get angulo() { return this.raiz.rotation.y; }
  get frente() { return new B.Vector3(Math.sin(this.angulo), 0, Math.cos(this.angulo)); }
  get velocidadeKmh() { return Math.abs(this.velocidade) * 3.6; }
  get cacambaMexendo() { return Math.abs(this.modelo.cacamba - this.alvoCacamba) > 0.001; }

  aplicarVisual(pref) {
    this.modelo.definirCor(pref.cor);
    this.modelo.definirRodas(pref.roda);
  }

  colocarEm(x, z, angulo) {
    this.raiz.position.set(x, 0, z);
    this.raiz.rotation.y = angulo;
    this.velocidade = 0;
    this.direcaoSuave = 0;
    this.marchaPendente = null;
    this.marcha = 'D';
  }

  alternarCacamba() {
    this.alvoCacamba = this.alvoCacamba ? 0 : 1;
    return this.alvoCacamba === 1;
  }

  // Pedido do câmbio. Se estiver andando no sentido contrário, freia sozinho antes.
  pedirMarcha(m) {
    if (m === this.marcha && !this.marchaPendente) return false;
    if (m === this.marcha) { this.marchaPendente = null; return true; }
    if (Math.abs(this.velocidade) < 0.3) {
      this.marcha = m;
      this.marchaPendente = null;
    } else {
      this.marchaPendente = m;
    }
    return true;
  }

  // dt: segundos desde o último quadro. entrada: { direcao, acelerar, frear }
  // mundo.bateu(pontos) diz se algum ponto do caminhão encostou em algo.
  atualizar(dt, entrada, mundo) {
    const C = CONFIG;
    const aproximar = (v, alvo, passo) => (v < alvo ? Math.min(v + passo, alvo) : Math.max(v - passo, alvo));

    // ---- velocidade ----
    if (this.marchaPendente) {
      this.velocidade = aproximar(this.velocidade, 0, C.freio * dt);
      if (Math.abs(this.velocidade) < 0.3) {
        this.velocidade = 0;
        this.marcha = this.marchaPendente;
        this.marchaPendente = null;
      }
    } else if (entrada.frear) {
      this.velocidade = aproximar(this.velocidade, 0, C.freio * dt);
    } else if (entrada.acelerar) {
      if (this.marcha === 'D') this.velocidade = aproximar(this.velocidade, C.velMaxFrente, C.aceleracao * dt);
      else this.velocidade = aproximar(this.velocidade, -C.velMaxRe, C.aceleracaoRe * dt);
    } else {
      this.velocidade = aproximar(this.velocidade, 0, C.rolagem * dt);
    }

    // ---- volante ----
    this.direcaoSuave = aproximar(this.direcaoSuave, entrada.direcao, C.suavizarDirecao * dt);

    // só vira andando (na ré, a frente vai para o lado contrário, como na vida real)
    const fator = Math.max(-1, Math.min(1, this.velocidade / C.velGiroCheio));
    const novoAngulo = this.angulo + this.direcaoSuave * C.giroMax * fator * dt;

    // ---- nova posição ----
    const passo = this.velocidade * dt;
    const nx = this.posicao.x + Math.sin(novoAngulo) * passo;
    const nz = this.posicao.z + Math.cos(novoAngulo) * passo;

    // pontos de contato ao longo do caminhão (frente, meio e traseira)
    const fx = Math.sin(novoAngulo), fz = Math.cos(novoAngulo);
    const [pf, pt] = MEDIDAS.pontosContato;
    const pontos = [pf, (pf + pt) / 2, pt].map((d) => ({ x: nx + fx * d, z: nz + fz * d }));

    if (Math.abs(passo) > 0 && mundo.bateu(pontos, 1.4)) {
      // encostou: para na hora, sem dano
      if (!this.encostado) this.aoEncostar && this.aoEncostar();
      this.encostado = true;
      this.velocidade = 0;
    } else {
      if (Math.abs(passo) > 0.001) this.encostado = false;
      this.raiz.rotation.y = novoAngulo;
      this.posicao.x = nx;
      this.posicao.z = nz;
    }

    // ---- animações ----
    this.modelo.animarRodas(this.velocidade * dt, this.direcaoSuave, dt);
    const atual = this.modelo.cacamba;
    if (this.cacambaMexendo) {
      const falta = this.alvoCacamba - atual;
      this.modelo.definirCacamba(atual + Math.sign(falta) * Math.min(Math.abs(falta), dt * 0.3));
    }
  }
}

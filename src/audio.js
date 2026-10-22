// Sons provisórios, gerados por código (Web Audio).
// Na etapa 5 eles são trocados por gravações reais do Freesound.
export class Audio {
  constructor() {
    this.ctx = null;
  }

  // Precisa ser chamado dentro de um toque na tela (regra dos navegadores).
  iniciar() {
    if (this.ctx) { this.ctx.resume(); return; }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();

    this.mestre = this.ctx.createGain();
    this.mestre.gain.value = 0.8;
    this.mestre.connect(this.ctx.destination);

    this._criarMotor();
    this._criarBuzina();
    this._criarBipRe();

    // pausa o som quando o jogo sai da tela
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) this.ctx.suspend(); else this.ctx.resume();
    });
  }

  // ----- Motor: ronco grave que sobe com a velocidade -----
  _criarMotor() {
    const c = this.ctx;
    this.motorFiltro = c.createBiquadFilter();
    this.motorFiltro.type = 'lowpass';
    this.motorFiltro.frequency.value = 300;
    this.motorGanho = c.createGain();
    this.motorGanho.gain.value = 0;
    this.motorFiltro.connect(this.motorGanho).connect(this.mestre);

    this.motorOsc1 = c.createOscillator();
    this.motorOsc1.type = 'sawtooth';
    this.motorOsc2 = c.createOscillator();
    this.motorOsc2.type = 'square';
    this.motorOsc1.connect(this.motorFiltro);
    const g2 = c.createGain(); g2.gain.value = 0.4;
    this.motorOsc2.connect(g2).connect(this.motorFiltro);
    this.motorOsc1.start();
    this.motorOsc2.start();
    this.atualizarMotor(0, false);
  }

  // rotacao: 0 (parado) a 1 (velocidade máxima)
  atualizarMotor(rotacao, acelerando) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const base = 38 + rotacao * 55 + (acelerando ? 8 : 0);
    this.motorOsc1.frequency.setTargetAtTime(base, t, 0.15);
    this.motorOsc2.frequency.setTargetAtTime(base * 0.5, t, 0.15);
    this.motorFiltro.frequency.setTargetAtTime(260 + rotacao * 500 + (acelerando ? 120 : 0), t, 0.2);
    this.motorGanho.gain.setTargetAtTime(0.10 + rotacao * 0.08 + (acelerando ? 0.04 : 0), t, 0.2);
  }

  desligarMotor() {
    if (!this.ctx) return;
    this.motorGanho.gain.setTargetAtTime(0, this.ctx.currentTime, 0.15);
  }

  // ----- Buzina: duas notas juntas, como buzina de caminhão -----
  _criarBuzina() {
    const c = this.ctx;
    const filtro = c.createBiquadFilter();
    filtro.type = 'lowpass';
    filtro.frequency.value = 2000;
    this.buzinaGanho = c.createGain();
    this.buzinaGanho.gain.value = 0;
    filtro.connect(this.buzinaGanho).connect(this.mestre);
    for (const f of [233, 294]) {
      const o = c.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      o.connect(filtro);
      o.start();
    }
  }

  buzina(ligada) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.buzinaGanho.gain.cancelScheduledValues(t);
    this.buzinaGanho.gain.setTargetAtTime(ligada ? 0.22 : 0, t, ligada ? 0.015 : 0.05);
  }

  // ----- Bip de ré: liga e desliga a cada meio segundo -----
  _criarBipRe() {
    const c = this.ctx;
    this.bipGanho = c.createGain();
    this.bipGanho.gain.value = 0;
    this.bipGanho.connect(this.mestre);
    const o = c.createOscillator();
    o.type = 'square';
    o.frequency.value = 1150;
    const suave = c.createBiquadFilter();
    suave.type = 'lowpass';
    suave.frequency.value = 2500;
    o.connect(suave).connect(this.bipGanho);
    o.start();
    this.bipLigado = false;
    this.bipTempo = 0;
  }

  // chamar todo quadro: dt em segundos
  atualizarBipRe(ligado, dt) {
    if (!this.ctx) return;
    this.bipLigado = ligado;
    if (!ligado) {
      this.bipGanho.gain.setTargetAtTime(0, this.ctx.currentTime, 0.01);
      this.bipTempo = 0;
      return;
    }
    this.bipTempo = (this.bipTempo + dt) % 1;
    const tocando = this.bipTempo < 0.5;
    this.bipGanho.gain.setTargetAtTime(tocando ? 0.07 : 0, this.ctx.currentTime, 0.008);
  }

  // ----- Bomba hidráulica da caçamba -----
  hidraulico(ligado) {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime;
    if (!this.hidroGanho) {
      this.hidroGanho = c.createGain();
      this.hidroGanho.gain.value = 0;
      const f = c.createBiquadFilter();
      f.type = 'bandpass'; f.frequency.value = 180; f.Q.value = 2;
      const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 95;
      const o2 = c.createOscillator(); o2.type = 'square'; o2.frequency.value = 47;
      o.connect(f); o2.connect(f);
      f.connect(this.hidroGanho).connect(this.mestre);
      o.start(); o2.start();
    }
    this.hidroGanho.gain.setTargetAtTime(ligado ? 0.09 : 0, t, 0.08);
  }

  // ----- Ruído curto filtrado (areia escorrendo, pedra batendo, tora caindo...) -----
  ruido({ dur = 0.2, freq = 800, tipo = 'lowpass', ganho = 0.3 } = {}) {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime;
    const buf = c.createBuffer(1, Math.max(1, Math.floor(c.sampleRate * dur)), c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2);
    const src = c.createBufferSource(); src.buffer = buf;
    const f = c.createBiquadFilter(); f.type = tipo; f.frequency.value = freq; f.Q.value = tipo === 'bandpass' ? 3 : 0.7;
    const g = c.createGain(); g.gain.value = ganho;
    src.connect(f).connect(g).connect(this.mestre);
    src.start(t);
  }

  // ----- "Plim" de carga pronta -----
  ding() {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime;
    [880, 1320].forEach((freq, i) => {
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'sine'; o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t + i * 0.14);
      g.gain.exponentialRampToValueAtTime(0.25, t + i * 0.14 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.14 + 0.6);
      o.connect(g).connect(this.mestre); o.start(t + i * 0.14); o.stop(t + i * 0.14 + 0.65);
    });
  }

  // ----- Clique curto para botões -----
  clique(agudo = false) {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(agudo ? 880 : 520, t);
    o.frequency.exponentialRampToValueAtTime(agudo ? 1320 : 780, t + 0.08);
    g.gain.setValueAtTime(0.18, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    o.connect(g).connect(this.mestre);
    o.start(t);
    o.stop(t + 0.13);
  }

  // ----- Batida leve: quando o caminhão encosta em algo -----
  toc(forte = false) {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime;
    if (forte) {
      // "tum" mais grave e encorpado para a batida com velocidade
      const r = c.createBufferSource();
      const buf = c.createBuffer(1, c.sampleRate * 0.25, c.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
      r.buffer = buf;
      const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 380;
      const g = c.createGain(); g.gain.value = 0.55;
      r.connect(f).connect(g).connect(this.mestre);
      r.start(t);
    }
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(60, t + 0.15);
    g.gain.setValueAtTime(0.3, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    o.connect(g).connect(this.mestre);
    o.start(t);
    o.stop(t + 0.22);
  }
}

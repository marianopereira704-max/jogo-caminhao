// Cargas da caçamba: carregar no depósito e descarregar em qualquer lugar (a obra guarda os montes).
// Cada material tem sua animação. Nada complexo: física "de mentirinha" com gravidade e um
// mapa de alturas simples para as peças empilharem no chão.
const B = window.BABYLON;

const LIMIAR_SOLTAR = 0.25;      // quanto a caçamba precisa levantar para a carga começar a sair
const MAX_PECAS_CHAO = 260;      // limite de peças no chão (desempenho)
const VIDA_FORA_DA_OBRA = 30;    // segundos até a carga largada fora da obra sumir

function mat(scene, nome, cor, brilho = 0.05) {
  const m = new B.StandardMaterial(nome, scene);
  m.diffuseColor = B.Color3.FromHexString(cor);
  m.specularColor = new B.Color3(brilho, brilho, brilho);
  return m;
}

function texCasca(scene) {
  const t = new B.DynamicTexture('tex-casca', { width: 128, height: 128 }, scene, true);
  const c = t.getContext();
  c.fillStyle = '#6b4627'; c.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 60; i++) {
    c.strokeStyle = `rgba(${30 + Math.random() * 40},${18 + Math.random() * 20},8,.6)`;
    c.lineWidth = 1 + Math.random() * 3;
    const x = Math.random() * 128;
    c.beginPath(); c.moveTo(x, 0); c.lineTo(x + (Math.random() - 0.5) * 10, 128); c.stroke();
  }
  t.update();
  return t;
}

function texTabua(scene) {
  const t = new B.DynamicTexture('tex-tabua', { width: 64, height: 256 }, scene, true);
  const c = t.getContext();
  c.fillStyle = '#d8ad6e'; c.fillRect(0, 0, 64, 256);
  for (let i = 0; i < 18; i++) {
    c.strokeStyle = `rgba(140,90,40,${0.2 + Math.random() * 0.3})`; c.lineWidth = 1 + Math.random() * 2;
    const x = Math.random() * 64;
    c.beginPath(); c.moveTo(x, 0); for (let y = 0; y <= 256; y += 32) c.lineTo(x + Math.sin(y / 40 + i) * 3, y); c.stroke();
  }
  t.update();
  return t;
}

function texGrao(scene) {
  const t = new B.DynamicTexture('tex-grao', { width: 32, height: 32 }, scene, false);
  const c = t.getContext();
  const g = c.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.6, 'rgba(255,255,255,.7)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; c.fillRect(0, 0, 32, 32);
  t.hasAlpha = true; t.update();
  return t;
}

export class Cargas {
  constructor(scene, { caminhao, patios, sombras, audio, aoMudar }) {
    this.scene = scene;
    this.caminhao = caminhao;
    this.modelo = caminhao.modelo;
    this.patios = patios;
    this.sombras = sombras;
    this.audio = audio;
    this.aoMudar = aoMudar || (() => {});
    this.tipo = null;
    this.fase = 'vazio';         // vazio | carregando | cheio | descarregando
    this.pecas = [];             // peças na caçamba (ou chegando nela)
    this.soltas = [];            // peças voando para o chão
    this.noChao = [];            // peças paradas no chão
    this.montesAreia = [];
    this.alturas = new Map();    // mapa de alturas do chão (células de 0,6 m)
    this.precisaSairDaBaia = false;
    this._bases(scene);
  }

  get ocupado() { return this.fase === 'carregando'; }

  // ---------- peças-modelo (as cargas são instâncias delas: baratas de desenhar) ----------
  _bases(scene) {
    const esconder = (m) => { m.isVisible = false; m.isPickable = false; this.sombras.addShadowCaster(m); return m; };
    const mPedra = [mat(scene, 'carga-pedra1', '#8e939a', 0.15), mat(scene, 'carga-pedra2', '#a39e95', 0.15), mat(scene, 'carga-pedra3', '#767b82', 0.15)];
    this.basePedra = mPedra.map((m, i) => {
      const p = B.MeshBuilder.CreateIcoSphere('pedra' + i, { radius: 0.3, subdivisions: 1, flat: true }, scene);
      p.scaling.set(1 + i * 0.12, 0.75, 1 - i * 0.08); p.bakeCurrentTransformIntoVertices();
      p.material = m; return esconder(p);
    });
    const mTora = mat(scene, 'carga-tora', '#ffffff', 0.02); mTora.diffuseTexture = texCasca(scene);
    const tora = B.MeshBuilder.CreateCylinder('tora', { diameter: 0.5, height: 5.6, tessellation: 10 }, scene);
    tora.rotation.x = Math.PI / 2; tora.bakeCurrentTransformIntoVertices();
    tora.material = mTora; this.baseTora = esconder(tora);
    const mTabua = mat(scene, 'carga-tabua', '#ffffff', 0.05); mTabua.diffuseTexture = texTabua(scene);
    const tabua = B.MeshBuilder.CreateBox('tabua', { width: 0.32, height: 0.06, depth: 5.2 }, scene);
    tabua.material = mTabua; this.baseTabua = esconder(tabua);
    this.mAreia = mat(scene, 'carga-areia', '#f2d9a4', 0.02);
    this.mAreia.emissiveColor = new B.Color3(0.12, 0.1, 0.06);
    const monteChao = B.MeshBuilder.CreateCylinder('monte-areia', { diameterTop: 0.15, diameterBottom: 1, height: 1, tessellation: 18 }, scene);
    monteChao.setPivotPoint(new B.Vector3(0, -0.5, 0)); monteChao.position.y = 0.5; monteChao.bakeCurrentTransformIntoVertices();
    monteChao.material = this.mAreia; this.baseMonte = esconder(monteChao);
    this.baseMonte.receiveShadows = true;

    // monte de areia dentro da caçamba (um só, cresce e diminui)
    const d = this.modelo.dimCacamba;
    this.monteCacamba = B.MeshBuilder.CreateSphere('areia-cacamba', { diameter: 1, segments: 12, updatable: true }, scene);
    // só a metade de cima (achata o que ficaria abaixo do fundo da caçamba)
    const pos = this.monteCacamba.getVerticesData(B.VertexBuffer.PositionKind);
    for (let i = 1; i < pos.length; i += 3) if (pos[i] < 0) pos[i] = 0;
    this.monteCacamba.updateVerticesData(B.VertexBuffer.PositionKind, pos);
    this.monteCacamba.material = this.mAreia;
    this.monteCacamba.parent = this.modelo.cacPivo;
    this.monteCacamba.position.set(0, d.fundo, d.comprimento / 2);
    this.monteCacamba.scaling.set(2.25, 0.01, d.comprimento - 0.4);
    this.monteCacamba.isVisible = false;
    this.sombras.addShadowCaster(this.monteCacamba);

    // jato de areia (o mesmo sistema serve para carregar e descarregar)
    const ps = new B.ParticleSystem('jato-areia', 500, scene);
    ps.particleTexture = texGrao(scene);
    ps.emitter = new B.Vector3(0, 0, 0);
    ps.minEmitBox = new B.Vector3(-0.3, 0, -0.3); ps.maxEmitBox = new B.Vector3(0.3, 0, 0.3);
    ps.color1 = new B.Color4(0.86, 0.74, 0.5, 1); ps.color2 = new B.Color4(0.78, 0.64, 0.4, 1);
    ps.colorDead = new B.Color4(0.7, 0.58, 0.36, 0);
    ps.minSize = 0.12; ps.maxSize = 0.28; ps.minLifeTime = 0.5; ps.maxLifeTime = 0.9;
    ps.emitRate = 0; ps.gravity = new B.Vector3(0, -12, 0);
    ps.direction1 = new B.Vector3(-0.3, -1, -0.3); ps.direction2 = new B.Vector3(0.3, -0.6, 0.3);
    ps.minEmitPower = 0.5; ps.maxEmitPower = 1.5;
    ps.blendMode = B.ParticleSystem.BLENDMODE_STANDARD;
    ps.start();
    this.jato = ps;
  }

  // posição no mundo de um ponto dentro da caçamba
  _mundo(local) {
    return B.Vector3.TransformCoordinates(local, this.modelo.cacPivo.computeWorldMatrix(true));
  }

  // ---------- onde cada peça fica dentro da caçamba ----------
  _posicoes(tipo) {
    const d = this.modelo.dimCacamba, f = d.fundo, zc = d.comprimento / 2;
    const lista = [];
    if (tipo === 'pedra') {
      for (let camada = 0; camada < 2; camada++) {
        for (let i = 0; i < 4; i++) for (let j = 0; j < 9 - camada * 2; j++) {
          lista.push(new B.Vector3(-0.85 + i * 0.57 + (Math.random() - 0.5) * 0.15, f + 0.25 + camada * 0.42, 0.6 + camada * 0.6 + j * 0.68 + (Math.random() - 0.5) * 0.2));
        }
      }
    } else if (tipo === 'tora') {
      const filas = [[-0.81, -0.27, 0.27, 0.81], [-0.54, 0, 0.54], [-0.27, 0.27]];
      filas.forEach((xs, k) => xs.forEach((x) => lista.push(new B.Vector3(x, f + 0.25 + k * 0.44, zc))));
    } else if (tipo === 'tabua') {
      for (let k = 0; k < 8; k++) for (const x of [-0.72, -0.36, 0, 0.36, 0.72]) lista.push(new B.Vector3(x, f + 0.05 + k * 0.07, zc));
    }
    return lista;
  }

  _instancia(tipo, i) {
    const base = tipo === 'pedra' ? this.basePedra[i % 3] : tipo === 'tora' ? this.baseTora : this.baseTabua;
    const m = base.createInstance('carga-' + tipo);
    m.isPickable = false;
    if (tipo === 'pedra') m.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
    return m;
  }

  // ======================= CARREGAR =======================
  _iniciarCarga(baia) {
    this.fase = 'carregando';
    this.tipo = baia.tipo;
    this.baia = baia;
    this.caminhao.travado = true;
    this.tCarga = -1;               // espera parar antes de começar
    this.aoMudar(this);
  }

  _animarCarga(dt) {
    const c = this.caminhao;
    if (this.tCarga < 0) {
      if (Math.abs(c.velocidade) > 0.15) return;
      this.tCarga = 0;
      this._prepararCarga();
    }
    this.tCarga += dt;
    const t = this.tCarga, tipo = this.tipo;
    const yaw = c.angulo;

    if (tipo === 'areia') {
      // jato saindo do funil; o monte cresce na caçamba
      this.jato.emitter = this.baia.bico.clone();
      this.jato.emitRate = t < 3.4 ? 450 : 0;
      this.monteCacamba.isVisible = true;
      this.monteCacamba.scaling.y = Math.min(1.5, 0.01 + (t / 3.4) * 1.5);
      if (Math.floor(t / 0.35) !== Math.floor((t - dt) / 0.35) && t < 3.4) this.audio.ruido({ dur: 0.4, freq: 900, ganho: 0.12 });
      if (t > 3.9) this._fimCarga();
      return;
    }

    if (tipo === 'pedra') {
      // pedras caem do funil uma a uma até o lugar delas na caçamba
      const intervalo = 0.11, voo = 0.45;
      this.pecas.forEach((p, i) => {
        const t0 = i * intervalo;
        if (t < t0) return;
        const k = Math.min(1, (t - t0) / voo);
        if (!p.mesh) { p.mesh = this._instancia('pedra', i); p.inicio = this.baia.bico.add(new B.Vector3((Math.random() - 0.5) * 0.4, 0, (Math.random() - 0.5) * 0.4)); }
        if (p.preso) return;
        const alvo = this._mundo(p.local);
        p.mesh.position.set(p.inicio.x + (alvo.x - p.inicio.x) * k, p.inicio.y + (alvo.y - p.inicio.y) * k * k, p.inicio.z + (alvo.z - p.inicio.z) * k);
        if (k >= 1) { p.mesh.setParent(this.modelo.cacPivo); p.preso = true; this.audio.ruido({ dur: 0.08, freq: 1900, tipo: 'bandpass', ganho: 0.25 }); }
      });
      if (t > this.pecas.length * intervalo + voo + 0.4) this._fimCarga();
      return;
    }

    // toras e tábuas: a ferramenta do pórtico vai até a caçamba, desce, solta e sobe
    const fer = this.baia.ferramenta;
    const centro = this._mundo(new B.Vector3(0, this.modelo.dimCacamba.fundo, this.modelo.dimCacamba.comprimento / 2));
    const repouso = new B.Vector3(this.baia.cx, this.baia.alturaFerramenta, this.baia.cz);
    if (tipo === 'tabua') {
      // um fardo só: vai (0,8 s), desce (2 s), solta, sobe (0,8 s)
      const fardo = this.fardo;
      const topo = new B.Vector3(centro.x, this.baia.alturaFerramenta, centro.z);
      const baixo = new B.Vector3(centro.x, centro.y + 1.65, centro.z);
      if (t < 0.8) B.Vector3.LerpToRef(repouso, topo, t / 0.8, fer.position);
      else if (t < 2.8) B.Vector3.LerpToRef(topo, baixo, (t - 0.8) / 2, fer.position);
      else if (t < 3.6) {
        if (!this.soltou) { this.soltou = true; for (const p of this.pecas) { p.mesh.setParent(this.modelo.cacPivo); p.preso = true; } this.audio.ruido({ dur: 0.18, freq: 500, tipo: 'bandpass', ganho: 0.35 }); }
        B.Vector3.LerpToRef(baixo, repouso, (t - 2.8) / 0.8, fer.position);
      } else { fer.position.copyFrom(repouso); this._fimCarga(); }
      if (!this.soltou) {
        fer.rotation.y = yaw;
        fardo.position.set(fer.position.x, fer.position.y - 1.65, fer.position.z);
        fardo.rotation.y = yaw;
        for (const p of this.pecas) {
          const w = B.Vector3.TransformCoordinates(p.relFardo, fardo.computeWorldMatrix(true));
          p.mesh.position.copyFrom(w); p.mesh.rotation.y = yaw;
        }
      }
      return;
    }

    // toras: uma por vez (1,1 s cada)
    const ciclo = 1.1;
    const i = Math.floor(t / ciclo), k = (t % ciclo) / ciclo;
    if (i >= this.pecas.length) { B.Vector3.LerpToRef(fer.position, repouso, Math.min(1, dt * 4), fer.position); if (t > this.pecas.length * ciclo + 0.6) { fer.position.copyFrom(repouso); this._fimCarga(); } return; }
    const p = this.pecas[i];
    if (!p.mesh) { p.mesh = this._instancia('tora', i); }
    const alvo = this._mundo(p.local);
    const cima = new B.Vector3(alvo.x, this.baia.alturaFerramenta, alvo.z);
    const embaixo = new B.Vector3(alvo.x, alvo.y + 0.75, alvo.z);
    if (k < 0.55) B.Vector3.LerpToRef(cima, embaixo, k / 0.55, fer.position);
    else B.Vector3.LerpToRef(embaixo, cima, (k - 0.55) / 0.45, fer.position);
    fer.rotation.y = yaw;
    if (!p.preso) {
      p.mesh.position.set(fer.position.x, fer.position.y - 0.75, fer.position.z);
      p.mesh.rotation.y = yaw;
      if (k >= 0.55) { p.mesh.position.copyFrom(alvo); p.mesh.setParent(this.modelo.cacPivo); p.preso = true; this.audio.ruido({ dur: 0.2, freq: 160, ganho: 0.5 }); }
    }
  }

  _prepararCarga() {
    this.soltou = false;
    this.pecas = this._posicoes(this.tipo).map((local) => ({ local, mesh: null, preso: false }));
    if (this.tipo === 'tabua') {
      // monta o fardo inteiro já pendurado no garfo
      this.fardo = this.fardo || new B.TransformNode('fardo', this.scene);
      const centroLocal = new B.Vector3(0, this.modelo.dimCacamba.fundo, this.modelo.dimCacamba.comprimento / 2);
      this.pecas.forEach((p, i) => { p.mesh = this._instancia('tabua', i); p.relFardo = p.local.subtract(centroLocal); });
    }
    if (this.tipo === 'areia') this.monteCacamba.scaling.y = 0.01;
  }

  _fimCarga() {
    this.fase = 'cheio';
    this.caminhao.travado = false;
    this.aoMudar(this);
    this.jato.emitRate = 0;
    this.precisaSairDaBaia = true;
    this.audio.ding();
    this.aoMudar(this);
  }

  // ======================= DESCARREGAR =======================
  _animarDescarga(dt) {
    const f = this.modelo.cacamba;
    if (this.tipo === 'areia') {
      const frac = Math.min(1, Math.max(0, (f - LIMIAR_SOLTAR) / 0.6));
      const antes = this.restanteAreia ?? 1;
      const agora = Math.min(antes, 1 - frac);
      this.restanteAreia = agora;
      this.monteCacamba.scaling.y = Math.max(0.01, 1.5 * agora);
      this.monteCacamba.position.z = this.modelo.dimCacamba.comprimento / 2 - (1 - agora) * 1.2;
      const saiu = antes - agora;
      const boca = this._mundo(new B.Vector3(0, this.modelo.dimCacamba.fundo + 0.2, -0.4));
      this.jato.emitter = boca;
      this.jato.emitRate = saiu > 0.0005 ? 600 : 0;
      if (saiu > 0) {
        const tras = this._mundo(new B.Vector3(0, 0, -2.2));
        this._crescerMonte(tras.x, tras.z, saiu);
        if (Math.random() < dt * 4) this.audio.ruido({ dur: 0.35, freq: 800, ganho: 0.1 });
      }
      if (agora <= 0.001) { this.monteCacamba.isVisible = false; this.restanteAreia = null; this._esvaziou(); }
      return;
    }
    // peças: as de trás saem primeiro; as da frente precisam de mais inclinação
    const presas = this.pecas.filter((p) => p.preso);
    const n = this.pecas.length;
    const ordem = [...this.pecas].sort((a, b) => a.local.z - b.local.z || a.local.y - b.local.y);
    ordem.forEach((p, rank) => {
      if (!p.preso) return;
      const limiar = LIMIAR_SOLTAR + 0.6 * (rank / n);
      if (f >= limiar) this._soltar(p);
    });
    if (presas.length && !this.pecas.some((p) => p.preso)) this._esvaziou();
  }

  _soltar(p) {
    p.preso = false;
    p.mesh.setParent(null);
    const cac = this.modelo.cacPivo.computeWorldMatrix(true);
    const paraTras = B.Vector3.TransformNormal(new B.Vector3(0, -0.25, -1), cac).normalize();
    const vel = paraTras.scale(2.2 + Math.random() * 1.6);
    vel.addInPlace(this.caminhao.frente.scale(this.caminhao.velocidade));
    const meia = this.tipo === 'pedra' ? 0.22 : this.tipo === 'tora' ? 0.25 : 0.03;
    const giro = this.tipo === 'pedra' ? new B.Vector3(Math.random() * 6 - 3, Math.random() * 6 - 3, Math.random() * 6 - 3) : B.Vector3.Zero();
    this.soltas.push({ mesh: p.mesh, vel, meia, giro, tipo: this.tipo, atraso: this.tipo === 'tabua' ? Math.random() * 0.4 : 0 });
    if (this.tipo === 'tabua' && Math.random() < 0.3) this.audio.ruido({ dur: 0.1, freq: 700, tipo: 'bandpass', ganho: 0.25 });
  }

  _esvaziou() {
    this.fase = 'vazio';
    this.tipo = null;
    this.pecas = [];
    this.jato.emitRate = 0;
    this.aoMudar(this);
  }

  // ---------- chão: alturas para empilhar ----------
  _chave(x, z) { return Math.round(x / 0.6) + ',' + Math.round(z / 0.6); }
  _altura(x, z) { return this.alturas.get(this._chave(x, z)) || 0; }
  _somarAltura(x, z, h) { const k = this._chave(x, z); this.alturas.set(k, Math.max(0, (this.alturas.get(k) || 0) + h)); }

  _crescerMonte(x, z, quantidade) {
    let monte = this.montesAreia.find((m) => Math.hypot(m.x - x, m.z - z) < 3.5);
    if (!monte) {
      const mesh = this.baseMonte.createInstance('monte');
      mesh.position.set(x, 0, z);
      monte = { mesh, x, z, volume: 0, nasceu: this.tempo, naObra: this.patios.naObra(x, z) };
      this.montesAreia.push(monte);
    }
    monte.volume = Math.min(6, monte.volume + quantidade);
    const v = monte.volume;
    monte.mesh.scaling.set(2.2 + v * 1.4, 0.6 + v * 0.45, 2.2 + v * 1.4);
    monte.nasceu = this.tempo;
  }

  _fisica(dt) {
    for (let i = this.soltas.length - 1; i >= 0; i--) {
      const s = this.soltas[i];
      if (s.atraso > 0) { s.atraso -= dt; continue; }
      s.vel.y -= 9.8 * dt;
      const m = s.mesh;
      m.position.addInPlace(s.vel.scale(dt));
      m.rotation.addInPlace(s.giro.scale(dt));
      const chao = this._altura(m.position.x, m.position.z);
      if (m.position.y - s.meia <= chao) {
        m.position.y = chao + s.meia;
        if (s.tipo === 'pedra') { m.rotation.x = Math.round(m.rotation.x); m.rotation.z = Math.round(m.rotation.z); }
        else { m.rotation.x = 0; m.rotation.z = 0; m.rotation.y += (Math.random() - 0.5) * 0.4; }
        const contribui = s.meia * 1.5;
        this._somarAltura(m.position.x, m.position.z, contribui);
        this.noChao.push({ mesh: m, x: m.position.x, z: m.position.z, contribui, desde: this.tempo, naObra: this.patios.naObra(m.position.x, m.position.z) });
        this.soltas.splice(i, 1);
        if (s.tipo === 'tora') this.audio.ruido({ dur: 0.15, freq: 140, ganho: 0.4 });
        else if (s.tipo === 'pedra' && Math.random() < 0.4) this.audio.ruido({ dur: 0.06, freq: 1700, tipo: 'bandpass', ganho: 0.2 });
      }
    }
  }

  // carga largada fora da obra some aos poucos; na obra fica (até um limite)
  _limpeza(dt) {
    for (let i = this.noChao.length - 1; i >= 0; i--) {
      const p = this.noChao[i];
      const velha = !p.naObra && this.tempo - p.desde > VIDA_FORA_DA_OBRA;
      const excesso = this.noChao.length > MAX_PECAS_CHAO && i === 0;
      if (velha || excesso || p.sumindo) {
        p.sumindo = (p.sumindo || 1) - dt * 0.8;
        p.mesh.scaling.setAll(Math.max(0.01, p.sumindo));
        if (p.sumindo <= 0.02 || excesso) {
          this._somarAltura(p.x, p.z, -p.contribui);
          p.mesh.dispose();
          this.noChao.splice(i, 1);
        }
      }
    }
    for (let i = this.montesAreia.length - 1; i >= 0; i--) {
      const m = this.montesAreia[i];
      if (m.naObra || this.tempo - m.nasceu < VIDA_FORA_DA_OBRA) continue;
      m.volume -= dt * 0.3;
      const v = Math.max(0, m.volume);
      m.mesh.scaling.set(2.2 + v * 1.4, Math.max(0.01, (0.6 + v * 0.45) * Math.min(1, m.volume + 0.2)), 2.2 + v * 1.4);
      if (m.volume <= -0.2) { m.mesh.dispose(); this.montesAreia.splice(i, 1); }
    }
  }

  atualizar(dt) {
    this.tempo = (this.tempo || 0) + dt;
    const d = this.modelo.dimCacamba;
    const f = this.modelo.cacamba;

    // onde está a caçamba? (fora de qualquer baia, libera a próxima carga)
    const centro = this._mundo(new B.Vector3(0, d.fundo, d.comprimento / 2));
    const baia = this.fase === 'carregando' ? this.baia : this.patios.baiaEm(centro.x, centro.z);
    if (!baia) this.precisaSairDaBaia = false;

    if (this.fase === 'vazio' && f < 0.02) {
      if (baia && !this.precisaSairDaBaia) this._iniciarCarga(baia);
    } else if (this.fase === 'carregando') {
      this._animarCarga(dt);
    } else if (this.fase === 'cheio' && f > LIMIAR_SOLTAR) {
      this.fase = 'descarregando';
    } else if (this.fase === 'descarregando') {
      if (f < LIMIAR_SOLTAR - 0.05 && this.tipo !== null) { this.fase = 'cheio'; this.jato.emitRate = 0; }
      else this._animarDescarga(dt);
    }
    this._fisica(dt);
    this._limpeza(dt);
  }
}

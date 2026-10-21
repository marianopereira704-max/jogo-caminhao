// Câmera em terceira pessoa que segue o caminhão de forma suave.
// A primeira pessoa (cabine) entra na etapa 4, com a cabine aprovada.
const B = window.BABYLON;

export class CameraSeguir {
  constructor(scene, canvas) {
    this.cam = new B.UniversalCamera('camera', new B.Vector3(0, 6, -14), scene);
    this.cam.minZ = 0.3;
    this.cam.maxZ = 700;
    this.cam.fov = 1.0;
    this.cam.inputs.clear();          // a câmera não responde a toques: só segue o caminhão
    this.alvo = new B.Vector3(0, 1.5, 0);
    this.distancia = 13;
    this.altura = 6;
  }

  // posiciona sem suavizar (ao começar ou ao voltar para a estrada)
  pular(caminhao) {
    this._calcular(caminhao, 1);
  }

  atualizar(caminhao, dt) {
    this._calcular(caminhao, 1 - Math.exp(-dt * 3.5));
  }

  _calcular(caminhao, mistura) {
    const f = caminhao.frente;
    const p = caminhao.posicao;
    const desejada = new B.Vector3(p.x - f.x * this.distancia, p.y + this.altura, p.z - f.z * this.distancia);
    // mira um pouco abaixo do caminhão, para ele aparecer acima da buzina
    const olhar = new B.Vector3(p.x + f.x * 3, p.y - 0.6, p.z + f.z * 3);
    B.Vector3.LerpToRef(this.cam.position, desejada, mistura, this.cam.position);
    B.Vector3.LerpToRef(this.alvo, olhar, mistura, this.alvo);
    this.cam.setTarget(this.alvo);
  }
}

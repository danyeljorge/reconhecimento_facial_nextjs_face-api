import {
  loadFaceApiModels,
  detectFacesInVideo,
  calculateLivenessMetrics,
  LivenessMetrics,
  LivenessSessionManager,
  LivenessFrameMetrics,
  extractFrameMetrics,
  LivenessVerdict,
} from "@/lib/face-api";

export interface FaceDetectionOutput {
  faceCount: number;
  box: { x: number; y: number; width: number; height: number } | null;
  landmarks: any | null;
  expressions: any | null;
  descriptor: number[] | null;
  detectionRaw: any | null;
}

export interface LivenessFrameSignals {
  actionDetected: string | null;
  isBlinking: boolean;
  isTurningLeft: boolean;
  isTurningRight: boolean;
  isCentered: boolean;
  isSmiling: boolean;
  isNeutral: boolean;
  ear: number;
  yawRatio: number;
  mouthRatio: number;
}

/**
 * Interface de abstração do serviço de biometria facial e liveness.
 * O serviço NÃO realiza identificação do usuário por Face Descriptor.
 * A autenticação é exclusiva por CPF + Senha.
 */
export interface IFaceRecognitionService {
  initialize(): Promise<void>;
  startCamera(video: HTMLVideoElement): Promise<MediaStream>;
  stopCamera(stream: MediaStream | null, video?: HTMLVideoElement | null): void;
  detectFace(video: HTMLVideoElement): Promise<FaceDetectionOutput>;
  extractSignals(landmarks: any, expressions?: any): LivenessFrameSignals;
  createLivenessSession(previousSequenceId?: number): LivenessSessionManager;
  captureFace(video: HTMLVideoElement, options?: { maxWidth?: number; quality?: number }): string;
}

export class FaceRecognitionServiceImpl implements IFaceRecognitionService {
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    await loadFaceApiModels("/models");
    this.initialized = true;
  }

  async startCamera(video: HTMLVideoElement): Promise<MediaStream> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("Seu navegador não possui suporte para acesso à webcam.");
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: "user",
      },
      audio: false,
    });

    video.srcObject = stream;

    try {
      await video.play();
    } catch {
      await new Promise<void>((resolve) => {
        video.onloadedmetadata = async () => {
          try {
            await video.play();
          } catch (e) {
            console.warn("Erro ao reproduzir stream de vídeo:", e);
          }
          resolve();
        };
        setTimeout(resolve, 800);
      });
    }

    return stream;
  }

  stopCamera(stream: MediaStream | null, video?: HTMLVideoElement | null): void {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    if (video) {
      video.srcObject = null;
    }
  }

  async detectFace(video: HTMLVideoElement): Promise<FaceDetectionOutput> {
    if (!this.initialized) {
      await this.initialize();
    }

    const result = await detectFacesInVideo(video, 0.5);

    if (result.faceCount === 1 && result.detection) {
      const box = result.detection.detection?.box || result.detection.box;
      return {
        faceCount: 1,
        box: box
          ? {
              x: box.x,
              y: box.y,
              width: box.width,
              height: box.height,
            }
          : null,
        landmarks: result.detection.landmarks,
        expressions: result.detection.expressions,
        descriptor: null,
        detectionRaw: result.detection,
      };
    }

    return {
      faceCount: result.faceCount,
      box: null,
      landmarks: null,
      expressions: null,
      descriptor: null,
      detectionRaw: null,
    };
  }

  /**
   * Extrai sinais biométricos brutos para alimentação da máquina de estados de liveness.
   * NOTA DE ARQUITETURA: Nenhum desses sinais isoladamente determina que o sujeito é uma pessoa real.
   * Eles são utilizados exclusivamente como evidência temporal dentro dos desafios multietapas.
   */
  extractSignals(landmarks: any, expressions?: any): LivenessFrameSignals {
    if (!landmarks) {
      return {
        actionDetected: null,
        isBlinking: false,
        isTurningLeft: false,
        isTurningRight: false,
        isCentered: false,
        isSmiling: false,
        isNeutral: true,
        ear: 0.28,
        yawRatio: 1.0,
        mouthRatio: 0.5,
      };
    }

    const metrics: LivenessMetrics = calculateLivenessMetrics(landmarks, expressions);

    let actionDetected: string | null = null;
    if (metrics.isBlinking) {
      actionDetected = "Olhos fechados";
    } else if (metrics.isTurningLeft) {
      actionDetected = "Virando à esquerda";
    } else if (metrics.isTurningRight) {
      actionDetected = "Virando à direita";
    } else if (metrics.isSmiling) {
      actionDetected = "Sorrindo";
    } else if (metrics.isCentered) {
      actionDetected = "Rosto centralizado";
    }

    return {
      actionDetected,
      isBlinking: metrics.isBlinking,
      isTurningLeft: metrics.isTurningLeft,
      isTurningRight: metrics.isTurningRight,
      isCentered: metrics.isCentered,
      isSmiling: metrics.isSmiling,
      isNeutral: !metrics.isSmiling && (expressions?.happy ?? 0) < 0.25,
      ear: metrics.ear,
      yawRatio: metrics.yawRatio,
      mouthRatio: metrics.mouthRatio,
    };
  }

  /**
   * Cria uma nova sessão de liveness com sequência aleatória de desafios multietapas.
   */
  createLivenessSession(previousSequenceId?: number): LivenessSessionManager {
    return new LivenessSessionManager(previousSequenceId);
  }

  /**
   * Captura o snapshot atual do vídeo em formato Base64 JPEG de alta qualidade.
   */
  captureFace(
    video: HTMLVideoElement,
    options: { maxWidth?: number; quality?: number } = {}
  ): string {
    const { maxWidth = 640, quality = 0.85 } = options;
    const canvas = document.createElement("canvas");
    const videoWidth = video.videoWidth || 640;
    const videoHeight = video.videoHeight || 480;

    const scale = Math.min(1, maxWidth / videoWidth);
    canvas.width = Math.round(videoWidth * scale);
    canvas.height = Math.round(videoHeight * scale);

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Não foi possível inicializar contexto de captura de imagem.");

    // Espelha horizontalmente se a câmera for user-facing (mesmo do preview)
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL("image/jpeg", quality);
  }
}

// Instância singleton do serviço biométrico
export const faceRecognitionService: IFaceRecognitionService = new FaceRecognitionServiceImpl();

/**
 * CAMERA SERVICE
 * Camada responsável exclusivamente pelo controle de hardware da câmera web (getUserMedia),
 * ciclo de reprodução no elemento <video> e captura de frames/snapshots.
 */

export interface ICameraService {
  startCamera(video: HTMLVideoElement, constraints?: MediaStreamConstraints): Promise<MediaStream>;
  stopCamera(stream: MediaStream | null, video?: HTMLVideoElement | null): void;
  captureSnapshot(
    video: HTMLVideoElement,
    options?: { maxWidth?: number; quality?: number; mirror?: boolean }
  ): string;
}

export class CameraService implements ICameraService {
  async startCamera(
    video: HTMLVideoElement,
    constraints?: MediaStreamConstraints
  ): Promise<MediaStream> {
    if (typeof window === "undefined" || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("Seu navegador não possui suporte para acesso à webcam.");
    }

    const defaultConstraints: MediaStreamConstraints = {
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: "user",
      },
      audio: false,
    };

    const finalConstraints = constraints || defaultConstraints;
    const stream = await navigator.mediaDevices.getUserMedia(finalConstraints);

    video.srcObject = stream;

    try {
      await video.play();
    } catch {
      await new Promise<void>((resolve) => {
        video.onloadedmetadata = async () => {
          try {
            await video.play();
          } catch (e) {
            console.warn("Aviso ao inicializar reprodução de vídeo:", e);
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

  captureSnapshot(
    video: HTMLVideoElement,
    options: { maxWidth?: number; quality?: number; mirror?: boolean } = {}
  ): string {
    const { maxWidth = 640, quality = 0.88, mirror = true } = options;

    const canvas = document.createElement("canvas");
    const videoWidth = video.videoWidth || 640;
    const videoHeight = video.videoHeight || 480;

    const scale = Math.min(1, maxWidth / videoWidth);
    canvas.width = Math.round(videoWidth * scale);
    canvas.height = Math.round(videoHeight * scale);

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Não foi possível inicializar contexto de captura de imagem.");
    }

    if (mirror) {
      // Espelha horizontalmente se for câmera frontal (mesma perspectiva do preview)
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL("image/jpeg", quality);
  }
}

export const cameraService: ICameraService = new CameraService();

/**
 * FACE ENGINE
 * Camada de abstração de visão computacional e detecção facial.
 * Isola a biblioteca subjacente (face-api.js) de modo que ela possa ser
 * substituída futuramente por outro motor (MediaPipe, WebAssembly PAD, etc.)
 * sem impactar o LivenessService ou a interface do usuário.
 */

import { FaceDetectionResult, LandmarkPoint } from "../types";

export interface IFaceEngine {
  initialize(modelsPath?: string): Promise<void>;
  isInitialized(): boolean;
  detectFace(video: HTMLVideoElement): Promise<FaceDetectionResult>;
}

export class FaceApiEngine implements IFaceEngine {
  private initialized = false;
  private loadingPromise: Promise<void> | null = null;
  private faceapiInstance: any = null;

  private async getFaceApiInstance(): Promise<any> {
    if (typeof window === "undefined") {
      throw new Error("Face Engine só pode ser executado no navegador.");
    }
    if (!this.faceapiInstance) {
      this.faceapiInstance = await import("@vladmandic/face-api");
    }
    return this.faceapiInstance;
  }

  async initialize(modelsPath: string = "/models"): Promise<void> {
    if (typeof window === "undefined") return;
    if (this.initialized) return;
    if (this.loadingPromise) return this.loadingPromise;

    this.loadingPromise = (async () => {
      try {
        const faceapi = await this.getFaceApiInstance();

        // Carrega modelos técnicos necessários para detecção, landmarks e expressões
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(modelsPath),
          faceapi.nets.faceLandmark68Net.loadFromUri(modelsPath),
          faceapi.nets.faceExpressionNet.loadFromUri(modelsPath),
        ]);

        this.initialized = true;
      } catch (error) {
        this.loadingPromise = null;
        console.error("Erro ao carregar modelos na Face Engine:", error);
        throw error;
      }
    })();

    return this.loadingPromise;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  async detectFace(video: HTMLVideoElement): Promise<FaceDetectionResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (video.paused || video.ended || video.readyState < 2) {
      return {
        faceCount: 0,
        box: null,
        landmarks: null,
        expressions: null,
      };
    }

    const faceapi = await this.getFaceApiInstance();
    const options = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 });

    // Detecção com landmarks 68 e expressões faciais (sem descriptor 128D)
    const results = await faceapi
      .detectAllFaces(video, options)
      .withFaceLandmarks()
      .withFaceExpressions();

    const faceCount = results.length;

    if (faceCount === 1) {
      const single = results[0];
      const b = single.detection?.box || single.box;

      const landmarksPositions: LandmarkPoint[] = single.landmarks?.positions
        ? single.landmarks.positions.map((p: any) => ({ x: p.x, y: p.y }))
        : [];

      return {
        faceCount: 1,
        box: b
          ? {
              x: b.x,
              y: b.y,
              width: b.width,
              height: b.height,
            }
          : null,
        landmarks: { positions: landmarksPositions },
        expressions: single.expressions || null,
      };
    }

    return {
      faceCount,
      box: null,
      landmarks: null,
      expressions: null,
    };
  }
}

export const faceEngine: IFaceEngine = new FaceApiEngine();

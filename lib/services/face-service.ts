/**
 * FACE SERVICE (Fachada de compatibilidade)
 * 
 * As responsabilidades foram devidamente refatoradas e segregadas em:
 * 1. CameraService (lib/camera/camera-service.ts) -> Hardware de câmera e captura
 * 2. FaceEngine (lib/face-engine/face-engine.ts) -> Detecção facial e isolamento do face-api.js
 * 3. LivenessService (lib/services/liveness-service.ts) -> Vivacidade e Anti-Spoofing
 * 
 * Esta classe atua como fachada para compatibilidade reversa suave.
 */

import { cameraService, ICameraService } from "@/lib/camera/camera-service";
import { faceEngine, IFaceEngine } from "@/lib/face-engine/face-engine";
import { livenessService, ILivenessService } from "@/lib/services/liveness-service";
import { LivenessSessionManager } from "@/lib/liveness/liveness-engine";
import {
  FaceDetectionResult,
  LivenessFrameSignals,
} from "@/lib/types";

export interface FaceDetectionOutput {
  faceCount: number;
  box: { x: number; y: number; width: number; height: number } | null;
  landmarks: any | null;
  expressions: any | null;
  descriptor: number[] | null;
  detectionRaw: any | null;
}

export type { LivenessFrameSignals };

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
  private camera: ICameraService;
  private engine: IFaceEngine;
  private liveness: ILivenessService;

  constructor(
    camera: ICameraService = cameraService,
    engine: IFaceEngine = faceEngine,
    liveness: ILivenessService = livenessService
  ) {
    this.camera = camera;
    this.engine = engine;
    this.liveness = liveness;
  }

  async initialize(): Promise<void> {
    await this.engine.initialize("/models");
  }

  async startCamera(video: HTMLVideoElement): Promise<MediaStream> {
    return this.camera.startCamera(video);
  }

  stopCamera(stream: MediaStream | null, video?: HTMLVideoElement | null): void {
    this.camera.stopCamera(stream, video);
  }

  async detectFace(video: HTMLVideoElement): Promise<FaceDetectionOutput> {
    const result: FaceDetectionResult = await this.engine.detectFace(video);

    return {
      faceCount: result.faceCount,
      box: result.box,
      landmarks: result.landmarks,
      expressions: result.expressions,
      descriptor: null,
      detectionRaw: result,
    };
  }

  extractSignals(landmarks: any, expressions?: any): LivenessFrameSignals {
    return this.liveness.extractSignals(landmarks, expressions);
  }

  createLivenessSession(previousSequenceId?: number): LivenessSessionManager {
    return this.liveness.createSession(previousSequenceId);
  }

  captureFace(
    video: HTMLVideoElement,
    options: { maxWidth?: number; quality?: number } = {}
  ): string {
    return this.camera.captureSnapshot(video, options);
  }
}

export const faceRecognitionService: IFaceRecognitionService = new FaceRecognitionServiceImpl();

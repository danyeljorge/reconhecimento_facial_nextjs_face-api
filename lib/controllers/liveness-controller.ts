/**
 * LIVENESS CONTROLLER (Application Layer / Client-Side Coordinator)
 * 
 * Orquestra o fluxo de verificação de segurança entre:
 * CameraService -> FaceEngine -> LivenessService -> UI
 * 
 * Isola a interface React do acoplamento técnico direto com o hardware da câmera
 * e com o motor de visão computacional.
 */

import { cameraService, ICameraService } from "@/lib/camera/camera-service";
import { faceEngine, IFaceEngine } from "@/lib/face-engine/face-engine";
import { livenessService, ILivenessService } from "@/lib/services/liveness-service";
import { LivenessSessionManager } from "@/lib/liveness/liveness-engine";
import {
  ChallengeStep,
  FaceDetectionResult,
  LivenessVerdict,
  StepEvaluation,
} from "@/lib/types";

export type LivenessControllerStatus =
  | "INICIANDO"
  | "AGUARDANDO_ROSTO"
  | "DESAFIO_EM_ANDAMENTO"
  | "VALIDANDO"
  | "SUCESSO"
  | "FALHA";

export interface LivenessControllerCallbacks {
  onStatusChange: (status: LivenessControllerStatus, title: string, feedback: string) => void;
  onStepProgress: (stepIndex: number, totalSteps: number, progressPercent: number) => void;
  onFramingChange: (faceCount: number, isWellFramed: boolean) => void;
  onSuccess: (photoBase64: string, verdict: LivenessVerdict) => void;
  onFailure: (reason: string) => void;
}

export class LivenessController {
  private isLoopRunning = false;
  private animationFrameId: number | null = null;
  private currentStream: MediaStream | null = null;
  private currentSession: LivenessSessionManager | null = null;
  private previousSequenceId?: number;
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

  public getSession(): LivenessSessionManager | null {
    return this.currentSession;
  }

  public getSteps(): ChallengeStep[] {
    return this.currentSession ? this.currentSession.steps : [];
  }

  /**
   * Inicia todo o pipeline de verificação de presença
   */
  async startVerification(
    video: HTMLVideoElement,
    callbacks: LivenessControllerCallbacks
  ): Promise<void> {
    this.stopVerification(video);

    callbacks.onStatusChange(
      "INICIANDO",
      "Preparando câmera...",
      "Aguardando inicialização da câmera e dos modelos..."
    );

    try {
      // 1. Conectar câmera
      this.currentStream = await this.camera.startCamera(video);

      // 2. Inicializar face engine
      await this.engine.initialize("/models");

      // 3. Criar nova sessão de desafios aleatórios
      this.currentSession = this.liveness.createSession(this.previousSequenceId);
      this.previousSequenceId = this.currentSession.sequenceId;

      callbacks.onStatusChange(
        "AGUARDANDO_ROSTO",
        "Posicione seu rosto dentro da área.",
        "Aproxime-se da câmera e centralize seu rosto no círculo."
      );
      callbacks.onStepProgress(0, this.currentSession.steps.length, 0);

      // 4. Iniciar loop de avaliação de frames
      this.isLoopRunning = true;
      let lastCheckTime = 0;
      const THROTTLE_MS = 85; // ~12 fps

      const loop = async (timestamp: number) => {
        if (!this.isLoopRunning) return;

        if (timestamp - lastCheckTime >= THROTTLE_MS) {
          lastCheckTime = timestamp;

          if (video.readyState >= 2 && !video.paused && !video.ended) {
            try {
              const detection: FaceDetectionResult = await this.engine.detectFace(video);
              const count = detection.faceCount;

              if (count === 0) {
                callbacks.onFramingChange(0, false);
                callbacks.onStatusChange(
                  "AGUARDANDO_ROSTO",
                  "Não conseguimos detectar seu rosto.",
                  "Posicione-se confortavelmente em frente à câmera com boa iluminação."
                );
              } else if (count > 1) {
                callbacks.onFramingChange(count, false);
                callbacks.onStatusChange(
                  "AGUARDANDO_ROSTO",
                  "Deixe apenas uma pessoa diante da câmera.",
                  "Múltiplos rostos detectados. A validação exige apenas uma pessoa."
                );
              } else if (count === 1 && detection.box && detection.landmarks) {
                const videoW = video.videoWidth || 640;
                const faceRatio = detection.box.width / videoW;
                const framed = faceRatio >= 0.13 && faceRatio <= 0.88;
                callbacks.onFramingChange(1, framed);

                if (!framed) {
                  callbacks.onStatusChange(
                    "AGUARDANDO_ROSTO",
                    "Ajuste a distância da câmera.",
                    faceRatio < 0.16
                      ? "Aproxime-se um pouco mais da câmera."
                      : "Afaste-se um pouco da câmera."
                  );
                } else if (this.currentSession) {
                  const step = this.currentSession.getCurrentStep();

                  if (!step) {
                    // Todos os desafios já foram concluídos
                    this.finalizeVerdict(video, callbacks);
                    return;
                  }

                  callbacks.onStatusChange("DESAFIO_EM_ANDAMENTO", step.title, step.instruction);

                  const frameMetrics = this.liveness.extractMetrics(
                    detection.landmarks,
                    detection.expressions,
                    detection.box
                  );

                  if (frameMetrics) {
                    const evalResult: StepEvaluation = this.currentSession.evaluateFrame(frameMetrics);
                    callbacks.onStepProgress(
                      this.currentSession.currentStepIndex,
                      this.currentSession.steps.length,
                      evalResult.progressPercent
                    );
                    callbacks.onStatusChange(
                      "DESAFIO_EM_ANDAMENTO",
                      step.title,
                      evalResult.feedbackText
                    );

                    if (evalResult.isStepComplete) {
                      const completed = this.currentSession.advanceStep();
                      callbacks.onStepProgress(
                        this.currentSession.currentStepIndex,
                        this.currentSession.steps.length,
                        0
                      );

                      if (completed) {
                        this.finalizeVerdict(video, callbacks);
                        return;
                      }
                    }
                  }
                }
              }
            } catch (err) {
              console.warn("Aviso no processamento do frame de liveness:", err);
            }
          }
        }

        if (this.isLoopRunning) {
          this.animationFrameId = requestAnimationFrame(loop);
        }
      };

      this.animationFrameId = requestAnimationFrame(loop);
    } catch (err: unknown) {
      console.error("Falha ao inicializar verificação de liveness:", err);
      let msg = "Precisamos acessar sua câmera para realizar a verificação de presença.";
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        msg = "Permissão da webcam foi negada no navegador. Permita o uso da câmera para continuar.";
      }
      callbacks.onStatusChange("FALHA", "Erro de acesso à câmera.", msg);
      callbacks.onFailure(msg);
    }
  }

  private finalizeVerdict(
    video: HTMLVideoElement,
    callbacks: LivenessControllerCallbacks
  ): void {
    this.isLoopRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    callbacks.onStatusChange(
      "VALIDANDO",
      "Verificando...",
      "Analisando consistência temporal dos movimentos..."
    );

    if (!this.currentSession) {
      callbacks.onStatusChange("FALHA", "Erro na sessão", "Sessão inválida.");
      callbacks.onFailure("Sessão inválida.");
      return;
    }

    const verdict = this.currentSession.generateFinalVerdict();

    if (verdict.success && !verdict.spoofDetected) {
      const photo = this.camera.captureSnapshot(video, { maxWidth: 640, quality: 0.88 });
      callbacks.onStatusChange(
        "SUCESSO",
        "Pessoa real confirmada.",
        "Verificação de presença concluída com sucesso!"
      );
      callbacks.onSuccess(photo, verdict);
    } else {
      const reason = verdict.reason || "Não foi possível confirmar que você é uma pessoa real.";
      callbacks.onStatusChange("FALHA", "Não foi possível confirmar sua presença.", reason);
      callbacks.onFailure(reason);
    }
  }

  /**
   * Encerra a verificação e para a câmera
   */
  stopVerification(video?: HTMLVideoElement | null): void {
    this.isLoopRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.camera.stopCamera(this.currentStream, video);
    this.currentStream = null;
  }
}

export const livenessController = new LivenessController();

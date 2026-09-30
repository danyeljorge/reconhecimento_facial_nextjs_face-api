/**
 * LIVENESS SERVICE
 * Responsável exclusivamente pelas regras de vivacidade (Proof of Life)
 * e detecção de ataques de apresentação (Presentation Attack Detection - PAD).
 * 
 * NÃO realiza autenticação e NÃO identifica quem é o usuário.
 * Retorna estritamente se há uma pessoa real presente diante da câmera.
 */

import {
  ChallengeStep,
  ChallengeStepType,
  LivenessFrameMetrics,
  StepEvaluation,
  LivenessVerdict,
  LandmarkPoint,
  FaceBoundingBox,
  LivenessFrameSignals,
} from "../types";

import {
  LivenessSessionManager,
  calculateEAR,
  calculateHeadYaw,
  calculateHeadPitch,
  calculateMouthRatio,
  calculateCentroid,
  generateRandomChallengeSequence,
  extractFrameMetrics,
} from "../liveness/liveness-engine";


export interface ILivenessService {
  createSession(previousSequenceId?: number): LivenessSessionManager;
  extractMetrics(
    landmarks: { positions?: LandmarkPoint[] } | LandmarkPoint[] | null,
    expressions: { happy?: number } | null | undefined,
    box: FaceBoundingBox
  ): LivenessFrameMetrics | null;
  extractSignals(landmarks: any, expressions?: any): LivenessFrameSignals;
}

export class LivenessService implements ILivenessService {
  /**
   * Cria uma nova sessão com sequência aleatória de desafios multietapas (Anti-Replay)
   */
  createSession(previousSequenceId?: number): LivenessSessionManager {
    return new LivenessSessionManager(previousSequenceId);
  }

  /**
   * Extrai métricas biométricas temporais de um frame (EAR, Yaw, Pitch, Boca, Centroide)
   */
  extractMetrics(
    landmarks: { positions?: LandmarkPoint[] } | LandmarkPoint[] | null,
    expressions: { happy?: number } | null | undefined,
    box: FaceBoundingBox
  ): LivenessFrameMetrics | null {
    return extractFrameMetrics(landmarks, expressions, box);
  }

  /**
   * Extrai sinais instantâneos para auxílio visual na interface
   */
  extractSignals(landmarks: any, expressions?: any): LivenessFrameSignals {
    const pts = landmarks?.positions || landmarks;
    if (!pts || pts.length < 68) {
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

    const ear = calculateEAR(pts);
    const yawRatio = calculateHeadYaw(pts);
    const mouthRatio = calculateMouthRatio(pts);

    const isBlinking = ear < 0.238;
    const isTurningLeft = yawRatio < 0.58;
    const isTurningRight = yawRatio > 1.75;
    const isCentered = yawRatio >= 0.70 && yawRatio <= 1.40;
    const isSmiling = (expressions?.happy ?? 0) > 0.50 || mouthRatio > 0.90;
    const isNeutral = !isSmiling && (expressions?.happy ?? 0) < 0.25;

    let actionDetected: string | null = null;
    if (isBlinking) {
      actionDetected = "Olhos fechados";
    } else if (isTurningLeft) {
      actionDetected = "Virando à esquerda";
    } else if (isTurningRight) {
      actionDetected = "Virando à direita";
    } else if (isSmiling) {
      actionDetected = "Sorrindo";
    } else if (isCentered) {
      actionDetected = "Rosto centralizado";
    }

    return {
      actionDetected,
      isBlinking,
      isTurningLeft,
      isTurningRight,
      isCentered,
      isSmiling,
      isNeutral,
      ear,
      yawRatio,
      mouthRatio,
    };
  }
}

export const livenessService: ILivenessService = new LivenessService();

export type ChallengeStepType =
  | "look_center"
  | "blink_twice"
  | "turn_left"
  | "turn_right"
  | "smile"
  | "return_center"
  | "return_neutral";

export interface ChallengeStep {
  id: string;
  type: ChallengeStepType;
  title: string;
  instruction: string;
  hint: string;
}

export interface LandmarkPoint {
  x: number;
  y: number;
}

export interface FaceBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FaceDetectionResult {
  faceCount: number;
  box: FaceBoundingBox | null;
  landmarks: { positions: LandmarkPoint[] } | any | null;
  expressions: Record<string, number> | any | null;
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

export interface LivenessFrameMetrics {
  timestamp: number;
  ear: number;
  yawRatio: number;
  pitchRatio: number;
  mouthRatio: number;
  isBlinking: boolean;
  isTurningLeft: boolean;
  isTurningRight: boolean;
  isCentered: boolean;
  isSmiling: boolean;
  isNeutral: boolean;
  box: FaceBoundingBox;
  centroid: LandmarkPoint;
}

export interface StepEvaluation {
  isStepComplete: boolean;
  progressPercent: number;
  actionDetected: string | null;
  feedbackText: string;
}

/**
 * Veredito emitido exclusivamente sobre a vivacidade/anti-spoofing.
 * NÃO contém e NÃO deve conter identificação de usuário.
 */
export interface LivenessVerdict {
  success: boolean;
  livenessPassed: boolean;
  spoofDetected: boolean;
  challengesCompleted: boolean;
  reason?: string;
  metricsSummary?: {
    totalFramesAnalyzed: number;
    durationMs: number;
    completedSteps: string[];
    antiSpoofSignalsPassed: string[];
  };
}

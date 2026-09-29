import type * as FaceApiType from "@vladmandic/face-api";

let faceapiInstance: typeof FaceApiType | null = null;
let modelsLoaded = false;
let modelLoadingPromise: Promise<void> | null = null;

export async function getFaceApi(): Promise<typeof FaceApiType> {
  if (typeof window === "undefined") {
    throw new Error("face-api só pode ser executado no navegador.");
  }

  if (!faceapiInstance) {
    faceapiInstance = await import("@vladmandic/face-api");
  }

  return faceapiInstance;
}

export async function loadFaceApiModels(
  modelsPath: string = "/models"
): Promise<void> {
  if (typeof window === "undefined") return;

  if (modelsLoaded) return;
  if (modelLoadingPromise) return modelLoadingPromise;

  modelLoadingPromise = (async () => {
    try {
      const faceapi = await getFaceApi();

      // Carrega os modelos:
      // 1. ssdMobilenetv1 para detecção facial de alta precisão
      // 2. faceLandmark68Net para landmarks faciais
      // 3. faceRecognitionNet para Face Descriptor (128D)
      // 4. faceExpressionNet para detecção de humor/expressão (feliz, normal, triste, raiva, etc.)
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(modelsPath),
        faceapi.nets.faceLandmark68Net.loadFromUri(modelsPath),
        faceapi.nets.faceRecognitionNet.loadFromUri(modelsPath),
        faceapi.nets.faceExpressionNet.loadFromUri(modelsPath),
      ]);

      modelsLoaded = true;
    } catch (error) {
      modelLoadingPromise = null;
      throw error;
    }
  })();

  return modelLoadingPromise;
}

export function isModelsLoaded(): boolean {
  return modelsLoaded;
}

export interface DominantEmotion {
  name: string;
  label: string;
  emoji: string;
  probability: number;
}

export interface DetectionResult {
  faceCount: number;
  descriptor: number[] | null;
  emotion: DominantEmotion | null;
  detection: any;
  allDetections: any[];
}

export function formatEmotion(expressionName: string, probability: number): DominantEmotion {
  const prob = Math.round(probability * 100);
  switch (expressionName) {
    case "happy":
      return { name: "happy", label: "Feliz", emoji: "😊", probability: prob };
    case "neutral":
      return { name: "neutral", label: "Normal (Neutro)", emoji: "😐", probability: prob };
    case "sad":
      return { name: "sad", label: "Triste", emoji: "😢", probability: prob };
    case "angry":
      return { name: "angry", label: "Com Raiva", emoji: "😠", probability: prob };
    case "surprised":
      return { name: "surprised", label: "Surpreso", emoji: "😮", probability: prob };
    case "fearful":
      return { name: "fearful", label: "Com Medo", emoji: "😨", probability: prob };
    case "disgusted":
      return { name: "disgusted", label: "Desconfortável", emoji: "🤢", probability: prob };
    default:
      return { name: expressionName, label: "Normal", emoji: "😐", probability: prob };
  }
}

export {
  FACE_MATCH_THRESHOLD,
  euclideanDistance,
  compareFace,
  type MatchResult,
} from "./face-recognition";

export interface ImageFaceDetectionResult {
  success: boolean;
  faceCount: number;
  descriptor: number[] | null;
  error?: string;
  detection?: any;
}

/**
 * Detecta e extrai Face Descriptor de uma imagem fornecida (Momento 1 - Cadastro)
 * Valida rigorosamente se existe exatamente 1 rosto na imagem.
 */
export async function detectFaceInImage(
  imageElement: HTMLImageElement | HTMLCanvasElement,
  minConfidence: number = 0.5
): Promise<ImageFaceDetectionResult> {
  if (typeof window === "undefined") {
    return {
      success: false,
      faceCount: 0,
      descriptor: null,
      error: "A detecção facial só pode ser executada no navegador.",
    };
  }

  const faceapi = await getFaceApi();

  if (!modelsLoaded) {
    await loadFaceApiModels("/models");
  }

  const options = new faceapi.SsdMobilenetv1Options({ minConfidence });

  const results = await faceapi
    .detectAllFaces(imageElement, options)
    .withFaceLandmarks()
    .withFaceDescriptors();

  const faceCount = results.length;

  if (faceCount === 0) {
    return {
      success: false,
      faceCount: 0,
      descriptor: null,
      error: "Não foi possível identificar um rosto na foto.",
    };
  }

  if (faceCount > 1) {
    return {
      success: false,
      faceCount,
      descriptor: null,
      error: "A foto deve conter apenas uma pessoa.",
    };
  }

  const single = results[0];
  const descriptor = Array.from(single.descriptor);

  return {
    success: true,
    faceCount: 1,
    descriptor,
    detection: single,
  };
}

export async function detectFacesInVideo(
  videoElement: HTMLVideoElement,
  minConfidence: number = 0.5
): Promise<DetectionResult> {
  if (typeof window === "undefined") {
    return { faceCount: 0, descriptor: null, emotion: null, detection: null, allDetections: [] };
  }

  const faceapi = await getFaceApi();

  if (!modelsLoaded) {
    throw new Error("Modelos faciais ainda não foram carregados.");
  }

  if (
    videoElement.paused ||
    videoElement.ended ||
    videoElement.readyState < 2
  ) {
    return {
      faceCount: 0,
      descriptor: null,
      emotion: null,
      detection: null,
      allDetections: [],
    };
  }

  const options = new faceapi.SsdMobilenetv1Options({ minConfidence });

  // Detecta faces com landmarks e expressões de humor (omite descritores 128D no vídeo para maior performance)
  const results = await faceapi
    .detectAllFaces(videoElement, options)
    .withFaceLandmarks()
    .withFaceExpressions();

  const faceCount = results.length;

  if (faceCount === 1) {
    const single = results[0];
    
    // Obter emoção dominante mais provável
    let dominantEmotion: DominantEmotion | null = null;
    if (single.expressions) {
      const sorted = single.expressions.asSortedArray();
      if (sorted && sorted.length > 0) {
        dominantEmotion = formatEmotion(sorted[0].expression, sorted[0].probability);
      }
    }

    return {
      faceCount: 1,
      descriptor: null,
      emotion: dominantEmotion,
      detection: single,
      allDetections: results.map((r) => r.detection),
    };
  }

  return {
    faceCount,
    descriptor: null,
    emotion: null,
    detection: null,
    allDetections: results.map((r) => r.detection),
  };
}

// -------------------------------------------------------------
// LIVENESS / ANTI-SPOOFING HELPERS (Baseado em 68 landmarks faciais)
// -------------------------------------------------------------

export type LivenessChallengeType = "blink" | "turn_left" | "turn_right" | "smile";

export interface LivenessMetrics {
  ear: number; // Eye Aspect Ratio (piscar)
  yawRatio: number; // Proporção horizontal do nariz (virar rosto)
  mouthRatio: number; // Abertura / largura de boca
  isBlinking: boolean;
  isTurningLeft: boolean;
  isTurningRight: boolean;
  isCentered: boolean;
  isSmiling: boolean;
}

/**
 * Calcula a distância euclidiana entre 2 pontos 2D
 */
function dist2D(p1: { x: number; y: number }, p2: { x: number; y: number }): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Extrai métricas biométricas de vivacidade a partir dos 68 landmarks
 */
export function calculateLivenessMetrics(
  landmarks: { positions: { x: number; y: number }[] },
  expressions?: { happy?: number }
): LivenessMetrics {
  const pts = landmarks.positions;
  if (!pts || pts.length < 68) {
    return {
      ear: 0.3,
      yawRatio: 1.0,
      mouthRatio: 0.5,
      isBlinking: false,
      isTurningLeft: false,
      isTurningRight: false,
      isCentered: true,
      isSmiling: false,
    };
  }

  // 1. EAR (Eye Aspect Ratio)
  // Olho esquerdo: 36..41
  const leftEyeHeight1 = dist2D(pts[37], pts[41]);
  const leftEyeHeight2 = dist2D(pts[38], pts[40]);
  const leftEyeWidth = dist2D(pts[36], pts[39]);
  const leftEAR = (leftEyeHeight1 + leftEyeHeight2) / (2.0 * (leftEyeWidth || 1));

  // Olho direito: 42..47
  const rightEyeHeight1 = dist2D(pts[43], pts[47]);
  const rightEyeHeight2 = dist2D(pts[44], pts[46]);
  const rightEyeWidth = dist2D(pts[42], pts[45]);
  const rightEAR = (rightEyeHeight1 + rightEyeHeight2) / (2.0 * (rightEyeWidth || 1));

  const ear = (leftEAR + rightEAR) / 2.0;
  // Se EAR < 0.238, o olho está fechado (piscando)
  const isBlinking = ear < 0.238;

  // 2. Head Yaw (Proporção de rotação horizontal da cabeça)
  // Ponto 30 é a ponta do nariz. Pontos 2 e 14 são os extremos da mandíbula.
  const noseX = pts[30].x;
  const leftJawDist = Math.abs(noseX - pts[2].x);
  const rightJawDist = Math.abs(pts[14].x - noseX);
  const yawRatio = leftJawDist / (rightJawDist + 0.001);

  // Como a câmera espelha o usuário:
  // Virar para a esquerda do usuário faz a distância da bochecha esquerda diminuir
  const isTurningLeft = yawRatio < 0.58;
  const isTurningRight = yawRatio > 1.75;
  const isCentered = yawRatio >= 0.70 && yawRatio <= 1.40;

  // 3. Sorriso (Expressão / Landmarks da boca)
  const mouthWidth = dist2D(pts[48], pts[54]);
  const eyeDistance = dist2D(pts[36], pts[45]);
  const mouthRatio = mouthWidth / (eyeDistance || 1);
  const isSmiling = (expressions?.happy ?? 0) > 0.50 || mouthRatio > 0.90;

  return {
    ear,
    yawRatio,
    mouthRatio,
    isBlinking,
    isTurningLeft,
    isTurningRight,
    isCentered,
    isSmiling,
  };
}

export * from "@/lib/liveness/liveness-engine";


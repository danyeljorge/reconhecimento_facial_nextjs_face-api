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

  // Detecta faces com landmarks, descriptors e expressões de humor
  const results = await faceapi
    .detectAllFaces(videoElement, options)
    .withFaceLandmarks()
    .withFaceExpressions()
    .withFaceDescriptors();

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
      descriptor: Array.from(single.descriptor),
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

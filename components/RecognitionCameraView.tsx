"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  CameraOff,
  Loader2,
  CheckCircle2,
  Users,
  RefreshCw,
  ScanFace,
  UserX,
  Smile,
} from "lucide-react";
import {
  loadFaceApiModels,
  detectFacesInVideo,
  getFaceApi,
  DominantEmotion,
} from "@/lib/face-api";

export interface RecognizedPersonData {
  id: string;
  name: string;
  distance: number;
  confidence: number;
  emotion?: DominantEmotion | null;
}

export interface RecognitionState {
  status: "initializing" | "loading_models" | "ready" | "no_face" | "multiple_faces" | "recognized" | "unrecognized" | "error";
  message: string;
  faceCount: number;
  match: RecognizedPersonData | null;
  currentEmotion?: DominantEmotion | null;
}

interface RecognitionCameraViewProps {
  onRecognitionChange?: (state: RecognitionState) => void;
  onRecognizedEvent?: (person: RecognizedPersonData) => void;
}

function euclideanDistance(v1: number[], v2: number[]): number {
  if (v1.length !== v2.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < v1.length; i++) {
    const diff = v1[i] - v2[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

export function RecognitionCameraView({
  onRecognitionChange,
  onRecognizedEvent,
}: RecognitionCameraViewProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isLoopRunningRef = useRef<boolean>(false);
  const animationFrameRef = useRef<number | null>(null);

  // Usar refs para callbacks do pai
  const onRecognitionChangeRef = useRef(onRecognitionChange);
  onRecognitionChangeRef.current = onRecognitionChange;

  const onRecognizedEventRef = useRef(onRecognizedEvent);
  onRecognizedEventRef.current = onRecognizedEvent;

  const registeredPersonsRef = useRef<
    { id: string; name: string; descriptor: number[] }[]
  >([]);

  const [status, setStatus] = useState<RecognitionState["status"]>("initializing");
  const [statusMessage, setStatusMessage] = useState<string>("Iniciando câmera...");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [registeredCount, setRegisteredCount] = useState<number>(0);
  const [liveEmotion, setLiveEmotion] = useState<DominantEmotion | null>(null);

  const updateState = useCallback(
    (
      newStatus: RecognitionState["status"],
      message: string,
      count: number = 0,
      match: RecognizedPersonData | null = null,
      emotion: DominantEmotion | null = null
    ) => {
      setStatus(newStatus);
      setStatusMessage(message);
      setLiveEmotion(emotion);

      if (onRecognitionChangeRef.current) {
        onRecognitionChangeRef.current({
          status: newStatus,
          message,
          faceCount: count,
          match,
          currentEmotion: emotion,
        });
      }
    },
    []
  );

  const loadRegisteredPersons = async () => {
    try {
      const res = await fetch("/api/recognize");
      const data = await res.json();
      if (data.success && Array.isArray(data.persons)) {
        registeredPersonsRef.current = data.persons;
        setRegisteredCount(data.persons.length);
      }
    } catch (err) {
      console.error("Erro ao carregar pessoas para reconhecimento:", err);
    }
  };

  const startRecognitionLoop = async () => {
    if (isLoopRunningRef.current) return;
    isLoopRunningRef.current = true;
    let lastDetectionTime = 0;
    const DETECTION_INTERVAL_MS = 200;
    const MATCH_THRESHOLD = 0.55;

    const faceapi = await getFaceApi();

    const loop = async (timestamp: number) => {
      if (!isLoopRunningRef.current) return;

      if (
        timestamp - lastDetectionTime >= DETECTION_INTERVAL_MS &&
        videoRef.current &&
        canvasRef.current
      ) {
        lastDetectionTime = timestamp;

        try {
          const video = videoRef.current;
          const canvas = canvasRef.current;

          if (video.readyState >= 2 && !video.paused && !video.ended) {
            const displaySize = {
              width: video.videoWidth || 640,
              height: video.videoHeight || 480,
            };

            faceapi.matchDimensions(canvas, displaySize);
            const result = await detectFacesInVideo(video, 0.5);

            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.clearRect(0, 0, canvas.width, canvas.height);
            }

            if (result.faceCount === 0) {
              updateState("no_face", "Nenhum rosto detectado na câmera.", 0, null, null);
            } else if (result.faceCount > 1) {
              const resizedDetections = faceapi.resizeResults(
                result.allDetections,
                displaySize
              );
              resizedDetections.forEach((d) => {
                if (ctx) {
                  const box = d.box;
                  ctx.strokeStyle = "#ef4444";
                  ctx.lineWidth = 3;
                  ctx.strokeRect(box.x, box.y, box.width, box.height);
                }
              });
              updateState(
                "multiple_faces",
                "Mais de um rosto detectado. Apenas uma pessoa deve aparecer.",
                result.faceCount,
                null,
                null
              );
            } else if (result.faceCount === 1 && result.detection && result.descriptor) {
              const resized = faceapi.resizeResults(result.detection, displaySize);
              const box = resized.detection.box;
              const liveDescriptor = result.descriptor;
              const emotion = result.emotion;

              let bestMatch: {
                id: string;
                name: string;
                distance: number;
              } | null = null;

              for (const reg of registeredPersonsRef.current) {
                const dist = euclideanDistance(liveDescriptor, reg.descriptor);
                if (!bestMatch || dist < bestMatch.distance) {
                  bestMatch = { id: reg.id, name: reg.name, distance: dist };
                }
              }

              if (ctx) {
                ctx.font = "bold 13px system-ui, -apple-system, sans-serif";
                ctx.textBaseline = "middle";

                // Texto do humor
                const emotionText = emotion ? `${emotion.emoji} ${emotion.label}` : "";

                if (bestMatch && bestMatch.distance <= MATCH_THRESHOLD) {
                  const confidence = Math.round(
                    Math.max(50, 100 - bestMatch.distance * 80)
                  );

                  // Caixa verde esmeralda no rosto
                  ctx.strokeStyle = "#10b981";
                  ctx.lineWidth = 3;
                  ctx.strokeRect(box.x, box.y, box.width, box.height);

                  // 1. Etiqueta superior: Nome + Confiança
                  const labelTop = `${bestMatch.name} (${confidence}%)`;
                  const textWidthTop = ctx.measureText(labelTop).width;
                  const labelX = box.x;
                  const labelY = Math.max(0, box.y - 28);

                  ctx.fillStyle = "#10b981";
                  ctx.fillRect(labelX, labelY, textWidthTop + 16, 24);

                  ctx.fillStyle = "#ffffff";
                  ctx.fillText(labelTop, labelX + 8, labelY + 12);

                  // 2. Etiqueta inferior: Humor da Pessoa
                  if (emotion) {
                    const textWidthBottom = ctx.measureText(emotionText).width;
                    const bottomY = box.y + box.height + 4;

                    ctx.fillStyle = "rgba(15, 23, 42, 0.85)"; // Fundo escuro sutil
                    ctx.fillRect(labelX, bottomY, textWidthBottom + 16, 22);

                    ctx.fillStyle = "#38bdf8"; // Azul claro / ciano
                    ctx.fillText(emotionText, labelX + 8, bottomY + 11);
                  }

                  const matchData: RecognizedPersonData = {
                    id: bestMatch.id,
                    name: bestMatch.name,
                    distance: Number(bestMatch.distance.toFixed(4)),
                    confidence,
                    emotion,
                  };

                  updateState(
                    "recognized",
                    `Pessoa reconhecida: ${bestMatch.name}`,
                    1,
                    matchData,
                    emotion
                  );

                  if (onRecognizedEventRef.current) {
                    onRecognizedEventRef.current(matchData);
                  }
                } else {
                  // Rosto não cadastrado
                  ctx.strokeStyle = "#f59e0b";
                  ctx.lineWidth = 3;
                  ctx.strokeRect(box.x, box.y, box.width, box.height);

                  // 1. Etiqueta superior: Não cadastrado
                  const labelTop = "Não cadastrado";
                  const textWidthTop = ctx.measureText(labelTop).width;
                  const labelX = box.x;
                  const labelY = Math.max(0, box.y - 28);

                  ctx.fillStyle = "#f59e0b";
                  ctx.fillRect(labelX, labelY, textWidthTop + 16, 24);

                  ctx.fillStyle = "#ffffff";
                  ctx.fillText(labelTop, labelX + 8, labelY + 12);

                  // 2. Etiqueta inferior: Humor
                  if (emotion) {
                    const textWidthBottom = ctx.measureText(emotionText).width;
                    const bottomY = box.y + box.height + 4;

                    ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
                    ctx.fillRect(labelX, bottomY, textWidthBottom + 16, 22);

                    ctx.fillStyle = "#fde047";
                    ctx.fillText(emotionText, labelX + 8, bottomY + 11);
                  }

                  updateState(
                    "unrecognized",
                    "Rosto não reconhecido no banco de dados.",
                    1,
                    null,
                    emotion
                  );
                }
              }
            }
          }
        } catch (err) {
          console.error("Erro no loop de reconhecimento:", err);
        }
      }

      if (isLoopRunningRef.current) {
        animationFrameRef.current = requestAnimationFrame(loop);
      }
    };

    animationFrameRef.current = requestAnimationFrame(loop);
  };

  const startCamera = async () => {
    setErrorMessage(null);
    updateState("initializing", "Acessando câmera...");

    try {
      await loadRegisteredPersons();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      updateState("loading_models", "Carregando modelos de reconhecimento e humor...");
      await loadFaceApiModels("/models");

      updateState("ready", "Câmera pronta. Posicione seu rosto.");
      startRecognitionLoop();
    } catch (err: unknown) {
      console.error("Erro ao inicializar:", err);
      let msg = "Não foi possível acessar a câmera.";
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        msg = "Permissão da câmera foi negada no navegador. Permita o acesso nas configurações do site.";
      } else if (err instanceof Error) {
        msg = err.message;
      }
      setErrorMessage(msg);
      updateState("error", msg);
    }
  };

  const stopCamera = () => {
    isLoopRunningRef.current = false;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const renderBadge = () => {
    switch (status) {
      case "initializing":
      case "loading_models":
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs sm:text-sm font-medium">
            <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
            <span>{statusMessage}</span>
          </div>
        );
      case "ready":
      case "no_face":
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-300 text-slate-700 text-xs sm:text-sm font-medium">
            <ScanFace className="w-4 h-4 text-slate-500" />
            <span>{statusMessage}</span>
          </div>
        );
      case "multiple_faces":
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm font-medium">
            <Users className="w-4 h-4 text-rose-600" />
            <span>{statusMessage}</span>
          </div>
        );
      case "recognized":
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs sm:text-sm font-semibold shadow-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{statusMessage}</span>
            {liveEmotion && (
              <span className="ml-1 pl-2 border-l border-emerald-300 font-bold">
                {liveEmotion.emoji} {liveEmotion.label}
              </span>
            )}
          </div>
        );
      case "unrecognized":
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-300 text-amber-800 text-xs sm:text-sm font-medium">
            <UserX className="w-4 h-4 text-amber-600" />
            <span>{statusMessage}</span>
            {liveEmotion && (
              <span className="ml-1 pl-2 border-l border-amber-300 font-bold">
                {liveEmotion.emoji} {liveEmotion.label}
              </span>
            )}
          </div>
        );
      case "error":
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm font-medium">
            <CameraOff className="w-4 h-4 text-rose-600" />
            <span>{statusMessage}</span>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col items-center w-full">
      <div className="relative w-full max-w-xl aspect-[4/3] bg-slate-900 rounded-2xl overflow-hidden border-2 border-slate-200 shadow-lg flex items-center justify-center">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={`w-full h-full object-cover transform -scale-x-100 ${
            status === "error" ? "hidden" : "block"
          }`}
        />

        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none transform -scale-x-100"
        />

        {status !== "error" && (
          <div
            className={`absolute inset-0 pointer-events-none flex items-center justify-center transition-opacity duration-300 ${
              status === "recognized" ? "opacity-20" : "opacity-40"
            }`}
          >
            <div
              className={`w-52 h-64 rounded-[50%] border-2 border-dashed transition-colors duration-300 ${
                status === "recognized"
                  ? "border-emerald-400"
                  : status === "unrecognized"
                  ? "border-amber-400"
                  : "border-white/60"
              }`}
            />
          </div>
        )}

        {status === "error" && (
          <div className="p-6 text-center max-w-sm flex flex-col items-center bg-white rounded-xl shadow-md m-4">
            <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-3 border border-rose-200">
              <CameraOff className="w-7 h-7" />
            </div>
            <h4 className="text-sm font-bold text-slate-800 mb-1">
              Câmera Indisponível
            </h4>
            <p className="text-xs text-slate-500 mb-4">{errorMessage}</p>
            <button
              onClick={startCamera}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Tentar novamente
            </button>
          </div>
        )}

        {(status === "initializing" || status === "loading_models") && (
          <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-10">
            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-3" />
            <p className="text-sm font-semibold text-slate-800">{statusMessage}</p>
            <p className="text-xs text-slate-500 mt-1">
              Carregando base de {registeredCount} biometria(s) e detecção de humor...
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-col items-center">
        {renderBadge()}
      </div>
    </div>
  );
}

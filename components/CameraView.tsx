"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Camera,
  CameraOff,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Users,
  RefreshCw,
} from "lucide-react";
import {
  loadFaceApiModels,
  detectFacesInVideo,
  getFaceApi,
} from "@/lib/face-api";

export type CameraStatusType =
  | "initializing"
  | "loading_models"
  | "camera_ready"
  | "no_face"
  | "multiple_faces"
  | "one_face"
  | "processing"
  | "error";

export interface CameraState {
  status: CameraStatusType;
  message: string;
  faceCount: number;
  descriptor: number[] | null;
  isReady: boolean;
}

interface CameraViewProps {
  onStateChange: (state: CameraState) => void;
  disabled?: boolean;
}

export function CameraView({ onStateChange, disabled = false }: CameraViewProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isLoopRunningRef = useRef<boolean>(false);
  const animationFrameRef = useRef<number | null>(null);

  // Usar refs para evitar qualquer ciclo de re-renderização
  const onStateChangeRef = useRef(onStateChange);
  onStateChangeRef.current = onStateChange;

  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;

  const [status, setStatus] = useState<CameraStatusType>("initializing");
  const [statusMessage, setStatusMessage] = useState<string>("Iniciando câmera...");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [faceCount, setFaceCount] = useState<number>(0);

  const updateCameraState = useCallback(
    (
      newStatus: CameraStatusType,
      message: string,
      count: number = 0,
      descriptor: number[] | null = null
    ) => {
      setStatus(newStatus);
      setStatusMessage(message);
      setFaceCount(count);

      if (onStateChangeRef.current) {
        onStateChangeRef.current({
          status: newStatus,
          message,
          faceCount: count,
          descriptor,
          isReady: newStatus === "one_face" && descriptor !== null && !disabledRef.current,
        });
      }
    },
    []
  );

  const startDetectionLoop = async () => {
    if (isLoopRunningRef.current) return;
    isLoopRunningRef.current = true;
    let lastDetectionTime = 0;
    const DETECTION_INTERVAL_MS = 200;

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
              updateCameraState(
                "no_face",
                "Nenhum rosto detectado. Posicione seu rosto diante da câmera.",
                0,
                null
              );
            } else if (result.faceCount > 1) {
              const resizedDetections = faceapi.resizeResults(
                result.allDetections,
                displaySize
              );
              resizedDetections.forEach((d) => {
                const box = d.box;
                if (ctx) {
                  ctx.strokeStyle = "#ef4444";
                  ctx.lineWidth = 3;
                  ctx.strokeRect(box.x, box.y, box.width, box.height);
                }
              });

              updateCameraState(
                "multiple_faces",
                "Mais de um rosto foi detectado. Apenas uma pessoa deve aparecer na câmera.",
                result.faceCount,
                null
              );
            } else if (result.faceCount === 1 && result.detection) {
              const resizedDetection = faceapi.resizeResults(
                result.detection,
                displaySize
              );

              if (ctx) {
                const box = resizedDetection.detection.box;
                ctx.strokeStyle = "#10b981";
                ctx.lineWidth = 3;
                ctx.strokeRect(box.x, box.y, box.width, box.height);

                ctx.fillStyle = "rgba(16, 185, 129, 0.8)";
                resizedDetection.landmarks.positions.forEach((point: { x: number; y: number }) => {
                  ctx.beginPath();
                  ctx.arc(point.x, point.y, 2, 0, 2 * Math.PI);
                  ctx.fill();
                });
              }

              updateCameraState(
                "one_face",
                "Rosto detectado. Pronto para cadastro.",
                1,
                result.descriptor
              );
            }
          }
        } catch (err) {
          console.error("Erro durante loop de detecção facial:", err);
        }
      }

      if (isLoopRunningRef.current) {
        animationFrameRef.current = requestAnimationFrame(loop);
      }
    };

    animationFrameRef.current = requestAnimationFrame(loop);
  };

  const startCameraAndModels = async () => {
    setErrorMessage(null);
    updateCameraState("initializing", "Aguardando câmera...");

    try {
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

      updateCameraState(
        "loading_models",
        "Carregando modelo de reconhecimento facial..."
      );

      await loadFaceApiModels("/models");

      updateCameraState(
        "camera_ready",
        "Câmera pronta. Posicione seu rosto diante da lente."
      );

      startDetectionLoop();
    } catch (err: unknown) {
      console.error("Erro ao inicializar câmera ou modelos:", err);
      let friendlyError =
        "Não foi possível acessar a câmera. Verifique as permissões do navegador.";

      if (err instanceof DOMException && err.name === "NotAllowedError") {
        friendlyError =
          "Permissão de acesso à webcam foi negada no navegador. Permita o uso da câmera para continuar.";
      } else if (err instanceof DOMException && err.name === "NotFoundError") {
        friendlyError = "Nenhuma câmera física foi encontrada neste dispositivo.";
      } else if (err instanceof Error) {
        friendlyError = `Falha ao carregar modelos ou câmera: ${err.message}`;
      }

      setErrorMessage(friendlyError);
      updateCameraState("error", friendlyError);
    }
  };

  const stopCamera = () => {
    isLoopRunningRef.current = false;

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
  };

  useEffect(() => {
    startCameraAndModels();

    return () => {
      stopCamera();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const renderStatusBadge = () => {
    switch (status) {
      case "initializing":
      case "loading_models":
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs sm:text-sm font-medium">
            <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
            <span>{statusMessage}</span>
          </div>
        );
      case "camera_ready":
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs sm:text-sm font-medium">
            <Camera className="w-4 h-4 text-blue-600" />
            <span>{statusMessage}</span>
          </div>
        );
      case "no_face":
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs sm:text-sm font-medium">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>{statusMessage}</span>
          </div>
        );
      case "multiple_faces":
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm font-medium">
            <Users className="w-4 h-4 text-rose-600" />
            <span>{statusMessage} ({faceCount} pessoas)</span>
          </div>
        );
      case "one_face":
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs sm:text-sm font-semibold shadow-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping inline-block" />
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{statusMessage}</span>
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
      <div className="relative w-full max-w-lg aspect-[4/3] bg-slate-900 rounded-2xl overflow-hidden border-2 border-slate-200 shadow-md flex items-center justify-center">
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
              status === "one_face" ? "opacity-30" : "opacity-50"
            }`}
          >
            <div
              className={`w-52 h-64 rounded-[50%] border-2 border-dashed transition-colors duration-300 ${
                status === "one_face"
                  ? "border-emerald-400"
                  : status === "multiple_faces"
                  ? "border-red-400"
                  : "border-white"
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
              onClick={startCameraAndModels}
              type="button"
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
            <p className="text-sm font-semibold text-slate-800">
              {statusMessage}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Inicializando inteligência biométrica no navegador...
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-col items-center">
        <div className="text-[11px] uppercase tracking-wider text-slate-400 mb-1 font-bold">
          Status da Biometria
        </div>
        {renderStatusBadge()}
      </div>
    </div>
  );
}

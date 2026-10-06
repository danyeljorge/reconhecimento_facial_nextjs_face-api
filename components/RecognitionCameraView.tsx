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
  ShieldCheck,
  ShieldAlert,
  Eye,
  RotateCcw,
} from "lucide-react";
import {
  loadFaceApiModels,
  detectFacesInVideo,
  getFaceApi,
  DominantEmotion,
  calculateLivenessMetrics,
} from "@/lib/face-api";
import {
  FACE_MATCH_THRESHOLD,
  compareFace,
} from "@/lib/face-recognition";
import { recognitionService } from "@/services/recognition.service";


export interface RecognizedPersonData {
  id: string;
  name: string;
  distance: number;
  confidence: number;
  emotion?: DominantEmotion | null;
}

export type AccessDecision = "GRANTED" | "BLOCKED" | "PENDING";
export type LivenessStage = "idle" | "verifying" | "passed" | "failed";

export interface AccessAuthorization {
  livenessApproved: boolean;
  livenessStage: LivenessStage;
  livenessAction?: string | null;
  isRegistered: boolean;
  decision: AccessDecision;
  message: string;
  person?: RecognizedPersonData | null;
}

export interface RecognitionState {
  status:
    | "initializing"
    | "loading_models"
    | "ready"
    | "no_face"
    | "multiple_faces"
    | "verifying_liveness"
    | "liveness_failed"
    | "recognized"
    | "unrecognized"
    | "error";
  message: string;
  faceCount: number;
  match: RecognizedPersonData | null;
  currentEmotion?: DominantEmotion | null;
  livenessStage: LivenessStage;
  livenessAction?: string | null;
  decision: AccessDecision;
}

interface RecognitionCameraViewProps {
  onRecognitionChange?: (state: RecognitionState) => void;
  onRecognizedEvent?: (person: RecognizedPersonData) => void;
  onAuthorizationChange?: (auth: AccessAuthorization) => void;
}

interface LivenessSession {
  stage: LivenessStage;
  startTime: number;
  blinkStep: "waiting_open" | "detected_closed" | "passed";
  smilePassed: boolean;
  turnPassed: boolean;
  passedAction: string | null;
  landmarkPositionsHistory: { x: number; y: number }[][];
}

export function RecognitionCameraView({
  onRecognitionChange,
  onRecognizedEvent,
  onAuthorizationChange,
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

  const onAuthorizationChangeRef = useRef(onAuthorizationChange);
  onAuthorizationChangeRef.current = onAuthorizationChange;

  const registeredPersonsRef = useRef<
    { id: string; name: string; descriptor: number[] }[]
  >([]);

  // Sessão de Liveness mantida em ref para o loop de alta performance
  const livenessSessionRef = useRef<LivenessSession>({
    stage: "idle",
    startTime: 0,
    blinkStep: "waiting_open",
    smilePassed: false,
    turnPassed: false,
    passedAction: null,
    landmarkPositionsHistory: [],
  });

  const [status, setStatus] = useState<RecognitionState["status"]>("initializing");
  const [statusMessage, setStatusMessage] = useState<string>("Iniciando câmera...");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [registeredCount, setRegisteredCount] = useState<number>(0);
  const [liveEmotion, setLiveEmotion] = useState<DominantEmotion | null>(null);
  const [livenessStage, setLivenessStage] = useState<LivenessStage>("idle");
  const [livenessAction, setLivenessAction] = useState<string | null>(null);
  const [currentDecision, setCurrentDecision] = useState<AccessDecision>("PENDING");

  const resetLivenessSession = useCallback(() => {
    livenessSessionRef.current = {
      stage: "idle",
      startTime: 0,
      blinkStep: "waiting_open",
      smilePassed: false,
      turnPassed: false,
      passedAction: null,
      landmarkPositionsHistory: [],
    };
    setLivenessStage("idle");
    setLivenessAction(null);
    setCurrentDecision("PENDING");
  }, []);

  const updateFullState = useCallback(
    (
      newStatus: RecognitionState["status"],
      message: string,
      count: number = 0,
      match: RecognizedPersonData | null = null,
      emotion: DominantEmotion | null = null,
      stage: LivenessStage = "idle",
      action: string | null = null,
      decision: AccessDecision = "PENDING"
    ) => {
      setStatus(newStatus);
      setStatusMessage(message);
      setLiveEmotion(emotion);
      setLivenessStage(stage);
      setLivenessAction(action);
      setCurrentDecision(decision);

      if (onRecognitionChangeRef.current) {
        onRecognitionChangeRef.current({
          status: newStatus,
          message,
          faceCount: count,
          match,
          currentEmotion: emotion,
          livenessStage: stage,
          livenessAction: action,
          decision,
        });
      }

      if (onAuthorizationChangeRef.current) {
        onAuthorizationChangeRef.current({
          livenessApproved: stage === "passed",
          livenessStage: stage,
          livenessAction: action,
          isRegistered: match !== null,
          decision,
          message,
          person: match,
        });
      }
    },
    []
  );

  const loadRegisteredPersons = async () => {
    try {
      const data = await recognitionService.listPersons();
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
    const DETECTION_INTERVAL_MS = 180;
    const LIVENESS_TIMEOUT_MS = 15000; // 15 segundos para completar desafio

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

            // CENÁRIO 1: NENHUM ROSTO DETECTADO
            if (result.faceCount === 0) {
              resetLivenessSession();
              updateFullState(
                "no_face",
                "Nenhum rosto detectado. Posicione-se diante da câmera.",
                0,
                null,
                null,
                "idle",
                null,
                "PENDING"
              );
            }
            // CENÁRIO 2: MÚLTIPLOS ROSTOS DETECTADOS -> BLOQUEAR
            else if (result.faceCount > 1) {
              resetLivenessSession();
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
              updateFullState(
                "multiple_faces",
                "Mais de um rosto detectado. Apenas uma pessoa deve aparecer diante da câmera.",
                result.faceCount,
                null,
                null,
                "idle",
                null,
                "BLOCKED"
              );
            }
            // CENÁRIO 3: EXATAMENTE 1 ROSTO DETECTADO
            else if (result.faceCount === 1 && result.detection && result.descriptor) {
              const resized = faceapi.resizeResults(result.detection, displaySize);
              const box = resized.detection.box;
              const liveDescriptor = result.descriptor;
              const emotion = result.emotion;
              const landmarks = resized.landmarks;

              // Calcular métricas biométricas de Liveness (EAR, rotação da cabeça, sorriso)
              const metrics = calculateLivenessMetrics(
                landmarks,
                result.detection.expressions
              );

              const session = livenessSessionRef.current;
              const now = Date.now();

              // Iniciar etapa de Liveness se estiver inativo
              if (session.stage === "idle") {
                session.stage = "verifying";
                session.startTime = now;
                session.blinkStep = metrics.ear >= 0.23 ? "waiting_open" : "detected_closed";
                session.passedAction = null;
              }

              // --- ETAPA DE VALIDAÇÃO DE VIVACIDADE (LIVENESS) ---
              if (session.stage === "verifying") {
                // 1. Verificação de Piscar de Olhos (Blink)
                if (session.blinkStep === "waiting_open") {
                  if (metrics.ear < 0.20) {
                    session.blinkStep = "detected_closed";
                  }
                } else if (session.blinkStep === "detected_closed") {
                  if (metrics.ear >= 0.24) {
                    session.blinkStep = "passed";
                    session.stage = "passed";
                    session.passedAction = "Piscou os olhos";
                  }
                }

                // 2. Verificação de Sorriso Real (alternativa natural para humanos)
                if (metrics.isSmiling && !session.passedAction) {
                  session.smilePassed = true;
                  session.stage = "passed";
                  session.passedAction = "Sorriso detectado";
                }

                // 3. Verificação de Rotação Suave de Cabeça (virar rosto)
                if ((metrics.isTurningLeft || metrics.isTurningRight) && !session.passedAction) {
                  session.turnPassed = true;
                  session.stage = "passed";
                  session.passedAction = metrics.isTurningLeft
                    ? "Virou rosto (esquerda)"
                    : "Virou rosto (direita)";
                }

                // 4. Timeout de Liveness (ex: foto estática mantida na câmera sem piscar/mover)
                if (now - session.startTime > LIVENESS_TIMEOUT_MS && session.stage !== "passed") {
                  session.stage = "failed";
                  session.passedAction = "Tempo esgotado sem movimento real";
                }
              }

              // --- DESENHO NO CANVAS E DECISÃO DE AUTORIZAÇÃO ---
              if (ctx) {
                ctx.font = "bold 13px system-ui, -apple-system, sans-serif";
                ctx.textBaseline = "middle";

                // CASO A: LIVENESS EM ANDAMENTO (VERIFICANDO PRESENÇA)
                if (session.stage === "verifying") {
                  // Caixa amarela/azul em progresso
                  ctx.strokeStyle = "#38bdf8";
                  ctx.lineWidth = 3;
                  ctx.setLineDash([8, 6]);
                  ctx.strokeRect(box.x, box.y, box.width, box.height);
                  ctx.setLineDash([]); // restaura

                  const labelTop = "Verificando Presença: Pisque os olhos ou sorria";
                  const textWidth = ctx.measureText(labelTop).width;
                  const labelX = box.x;
                  const labelY = Math.max(0, box.y - 28);

                  ctx.fillStyle = "#0284c7";
                  ctx.fillRect(labelX, labelY, textWidth + 16, 24);
                  ctx.fillStyle = "#ffffff";
                  ctx.fillText(labelTop, labelX + 8, labelY + 12);

                  updateFullState(
                    "verifying_liveness",
                    "Aguardando movimento natural: Pisque os olhos ou sorria.",
                    1,
                    null,
                    emotion,
                    "verifying",
                    null,
                    "PENDING"
                  );
                }
                // CASO B: LIVENESS FALHOU (POSSÍVEL FOTO IMPRESSA OU TELA ESTÁTICA) -> ACESSO BLOQUEADO
                else if (session.stage === "failed") {
                  ctx.strokeStyle = "#ef4444";
                  ctx.lineWidth = 3;
                  ctx.strokeRect(box.x, box.y, box.width, box.height);

                  const labelTop = "Liveness Reprovado - ACESSO BLOQUEADO";
                  const textWidth = ctx.measureText(labelTop).width;
                  const labelX = box.x;
                  const labelY = Math.max(0, box.y - 28);

                  ctx.fillStyle = "#ef4444";
                  ctx.fillRect(labelX, labelY, textWidth + 16, 24);
                  ctx.fillStyle = "#ffffff";
                  ctx.fillText(labelTop, labelX + 8, labelY + 12);

                  updateFullState(
                    "liveness_failed",
                    "Não foi possível confirmar a presença de uma pessoa real.",
                    1,
                    null,
                    emotion,
                    "failed",
                    session.passedAction,
                    "BLOCKED"
                  );
                }
                // CASO C: LIVENESS APROVADO! PROSSEGUIR PARA COMPARAÇÃO COM O BANCO
                else if (session.stage === "passed") {
                  const { match, bestMatch } = compareFace(
                    liveDescriptor,
                    registeredPersonsRef.current,
                    FACE_MATCH_THRESHOLD
                  );

                  // REGRA DE OURO: LIVENESS APROVADO + PESSOA CADASTRADA = ACESSO LIBERADO
                  if (match) {
                    const matchData: RecognizedPersonData = {
                      id: match.id,
                      name: match.name,
                      distance: match.distance,
                      confidence: match.confidence,
                      emotion,
                    };

                    // Caixa verde esmeralda no rosto
                    ctx.strokeStyle = "#10b981";
                    ctx.lineWidth = 3;
                    ctx.strokeRect(box.x, box.y, box.width, box.height);

                    // 1. Etiqueta superior: Nome + ACESSO LIBERADO
                    const labelTop = `ACESSO LIBERADO: ${match.name} (${match.confidence}%)`;
                    const textWidthTop = ctx.measureText(labelTop).width;
                    const labelX = box.x;
                    const labelY = Math.max(0, box.y - 28);

                    ctx.fillStyle = "#10b981";
                    ctx.fillRect(labelX, labelY, textWidthTop + 16, 24);
                    ctx.fillStyle = "#ffffff";
                    ctx.fillText(labelTop, labelX + 8, labelY + 12);

                    // 2. Etiqueta inferior: Presença confirmada + Humor
                    const actionText = session.passedAction || "Presença confirmada";
                    const emotionText = emotion ? ` • ${emotion.emoji} ${emotion.label}` : "";
                    const labelBottom = `✓ ${actionText}${emotionText}`;
                    const textWidthBottom = ctx.measureText(labelBottom).width;
                    const bottomY = box.y + box.height + 4;

                    ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
                    ctx.fillRect(labelX, bottomY, textWidthBottom + 16, 22);
                    ctx.fillStyle = "#34d399";
                    ctx.fillText(labelBottom, labelX + 8, bottomY + 11);

                    updateFullState(
                      "recognized",
                      `Acesso Liberado para ${match.name}`,
                      1,
                      matchData,
                      emotion,
                      "passed",
                      session.passedAction,
                      "GRANTED"
                    );

                    if (onRecognizedEventRef.current) {
                      onRecognizedEventRef.current(matchData);
                    }
                  }
                  // REGRA DE OURO: LIVENESS APROVADO + NÃO CADASTRADO = ACESSO BLOQUEADO
                  else {
                    // Caixa amarela/âmbar de não cadastrado
                    ctx.strokeStyle = "#f59e0b";
                    ctx.lineWidth = 3;
                    ctx.strokeRect(box.x, box.y, box.width, box.height);

                    // 1. Etiqueta superior: Pessoa não cadastrada - ACESSO BLOQUEADO
                    const labelTop = "PESSOA NÃO CADASTRADA - ACESSO BLOQUEADO";
                    const textWidthTop = ctx.measureText(labelTop).width;
                    const labelX = box.x;
                    const labelY = Math.max(0, box.y - 28);

                    ctx.fillStyle = "#d97706";
                    ctx.fillRect(labelX, labelY, textWidthTop + 16, 24);
                    ctx.fillStyle = "#ffffff";
                    ctx.fillText(labelTop, labelX + 8, labelY + 12);

                    // 2. Etiqueta inferior: Presença confirmada
                    const actionText = session.passedAction || "Presença confirmada";
                    const emotionText = emotion ? ` • ${emotion.emoji} ${emotion.label}` : "";
                    const labelBottom = `✓ Pessoa Real (${actionText})${emotionText}`;
                    const textWidthBottom = ctx.measureText(labelBottom).width;
                    const bottomY = box.y + box.height + 4;

                    ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
                    ctx.fillRect(labelX, bottomY, textWidthBottom + 16, 22);
                    ctx.fillStyle = "#fbbf24";
                    ctx.fillText(labelBottom, labelX + 8, bottomY + 11);

                    updateFullState(
                      "unrecognized",
                      "Pessoa não cadastrada no sistema. Acesso bloqueado.",
                      1,
                      null,
                      emotion,
                      "passed",
                      session.passedAction,
                      "BLOCKED"
                    );
                  }
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
    updateFullState("initializing", "Acessando câmera...", 0, null, null, "idle", null, "PENDING");

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

      updateFullState(
        "loading_models",
        "Carregando modelos de reconhecimento facial e liveness...",
        0,
        null,
        null,
        "idle",
        null,
        "PENDING"
      );
      await loadFaceApiModels("/models");

      updateFullState(
        "ready",
        "Câmera pronta. Posicione seu rosto diante da lente.",
        0,
        null,
        null,
        "idle",
        null,
        "PENDING"
      );
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
      updateFullState("error", msg, 0, null, null, "idle", null, "BLOCKED");
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
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs sm:text-sm font-medium">
            <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
            <span>{statusMessage}</span>
          </div>
        );
      case "ready":
      case "no_face":
        return (
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 border border-slate-300 text-slate-700 text-xs sm:text-sm font-medium">
            <ScanFace className="w-4 h-4 text-slate-500" />
            <span>{statusMessage}</span>
          </div>
        );
      case "multiple_faces":
        return (
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm font-medium">
            <Users className="w-4 h-4 text-rose-600" />
            <span>{statusMessage}</span>
          </div>
        );
      case "verifying_liveness":
        return (
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-50 border border-sky-300 text-sky-800 text-xs sm:text-sm font-semibold shadow-sm animate-pulse">
            <Eye className="w-4 h-4 text-sky-600" />
            <span>{statusMessage}</span>
          </div>
        );
      case "liveness_failed":
        return (
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-50 border border-rose-300 text-rose-800 text-xs sm:text-sm font-semibold">
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            <span>{statusMessage}</span>
          </div>
        );
      case "recognized":
        return (
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs sm:text-sm font-bold shadow-sm">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>{statusMessage}</span>
            {liveEmotion && (
              <span className="ml-1 pl-2 border-l border-emerald-300 font-semibold text-emerald-700">
                {liveEmotion.emoji} {liveEmotion.label}
              </span>
            )}
          </div>
        );
      case "unrecognized":
        return (
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber-300 text-amber-800 text-xs sm:text-sm font-semibold">
            <UserX className="w-4 h-4 text-amber-600" />
            <span>{statusMessage}</span>
            {liveEmotion && (
              <span className="ml-1 pl-2 border-l border-amber-300 font-semibold text-amber-700">
                {liveEmotion.emoji} {liveEmotion.label}
              </span>
            )}
          </div>
        );
      case "error":
        return (
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm font-medium">
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
              currentDecision === "GRANTED"
                ? "opacity-20"
                : currentDecision === "BLOCKED"
                ? "opacity-35"
                : "opacity-40"
            }`}
          >
            <div
              className={`w-52 h-64 rounded-[50%] border-2 border-dashed transition-colors duration-300 ${
                currentDecision === "GRANTED"
                  ? "border-emerald-400"
                  : currentDecision === "BLOCKED"
                  ? "border-rose-400"
                  : livenessStage === "verifying"
                  ? "border-sky-400"
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
              Carregando base biométrica ({registeredCount} cadastros) e motor anti-spoofing...
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-col sm:flex-row items-center justify-between w-full max-w-xl gap-2 px-1">
        <div className="flex-1 flex justify-center sm:justify-start">
          {renderBadge()}
        </div>

        {/* Botão de Nova Verificação / Próxima Pessoa */}
        {(currentDecision === "GRANTED" || currentDecision === "BLOCKED" || livenessStage === "failed") && (
          <button
            type="button"
            onClick={resetLivenessSession}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-300 transition shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Nova Verificação
          </button>
        )}
      </div>
    </div>
  );
}

"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Camera,
  CameraOff,
  Loader2,
  Eye,
  Smile,
  ArrowRight,
  ArrowLeft,
  Clock,
  UserCheck,
  Sparkles,
} from "lucide-react";
import { cameraService } from "@/lib/camera/camera-service";
import { faceEngine } from "@/lib/face-engine/face-engine";
import { livenessService } from "@/lib/services/liveness-service";
import {
  ChallengeStep,
  ChallengeStepType,
  FaceDetectionResult,
} from "@/lib/types";
import { LivenessSessionManager } from "@/lib/liveness/liveness-engine";


export type LivenessUIState =
  | "INICIANDO"
  | "AGUARDANDO_ROSTO"
  | "DESAFIO_EM_ANDAMENTO"
  | "VALIDANDO"
  | "SUCESSO"
  | "FALHA";

interface LivenessSecurityVerificationProps {
  onVerified: (capturedPhotoBase64: string) => void;
  onCancel?: () => void;
  userName?: string;
  verificationReason?: "CADASTRO_INICIAL" | "AUDITORIA_ALEATORIA" | null;
}

const TOTAL_TIMEOUT_SECONDS = 60;

export function LivenessSecurityVerification({
  onVerified,
  onCancel,
  userName,
  verificationReason,
}: LivenessSecurityVerificationProps) {
  const [uiState, setUiState] = useState<LivenessUIState>("INICIANDO");
  const [statusMessage, setStatusMessage] = useState<string>("Preparando câmera...");
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Desafios e Sessão
  const sessionManagerRef = useRef<LivenessSessionManager | null>(null);
  const previousSequenceIdRef = useRef<number | undefined>(undefined);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [steps, setSteps] = useState<ChallengeStep[]>([]);
  const [stepProgress, setStepProgress] = useState<number>(0);
  const [feedbackText, setFeedbackText] = useState<string>("");

  // Temporizador de 60 segundos
  const [remainingSeconds, setRemainingSeconds] = useState<number>(TOTAL_TIMEOUT_SECONDS);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Enquadramento e presença
  const [faceCount, setFaceCount] = useState<number>(0);
  const [isWellFramed, setIsWellFramed] = useState<boolean>(false);

  // Câmera refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isLoopActiveRef = useRef<boolean>(false);
  const animationFrameRef = useRef<number | null>(null);

  // Limpa timer
  const clearTimer = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  // Para a câmera
  const stopCamera = useCallback(() => {
    isLoopActiveRef.current = false;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    clearTimer();
    cameraService.stopCamera(streamRef.current, videoRef.current);
    streamRef.current = null;
  }, [clearTimer]);

  // Inicia o temporizador de contagem regressiva
  const startTimer = useCallback(() => {
    clearTimer();
    setRemainingSeconds(TOTAL_TIMEOUT_SECONDS);
    timerIntervalRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearTimer();
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [clearTimer]);

  // Trata o tempo esgotado (60s)
  const handleTimeout = useCallback(() => {
    isLoopActiveRef.current = false;
    setUiState("FALHA");
    setStatusMessage("Tempo esgotado.");
    setFeedbackText("Não foi possível confirmar sua presença dentro do tempo limite (60 segundos).");
  }, []);

  // Inicia ou reinicia uma sessão de liveness completa
  const startSession = useCallback(async () => {
    setCameraError(null);
    clearTimer();
    setStepProgress(0);

    // 1. Cria nova sessão com sequência de desafios garantidamente aleatória
    const session = livenessService.createSession(previousSequenceIdRef.current);
    previousSequenceIdRef.current = session.sequenceId;
    sessionManagerRef.current = session;
    setSteps(session.steps);
    setCurrentStepIndex(0);

    setUiState("INICIANDO");
    setStatusMessage("Preparando câmera...");
    setFeedbackText("Aguardando inicialização da câmera e dos modelos...");

    try {
      if (!videoRef.current) {
        throw new Error("Elemento de vídeo não encontrado no DOM.");
      }

      // 2. Conecta webcam via CameraService
      const stream = await cameraService.startCamera(videoRef.current);
      streamRef.current = stream;

      // 3. Inicializa modelos via FaceEngine
      setStatusMessage("Preparando câmera...");
      await faceEngine.initialize("/models");

      // 4. Pronto para aguardar o rosto
      setUiState("AGUARDANDO_ROSTO");
      setStatusMessage("Posicione seu rosto dentro da área.");
      setFeedbackText("Aproxime-se da câmera e centralize seu rosto no círculo.");

      // Inicia contagem regressiva de 60s
      startTimer();

      // 5. Laço de detecção temporal contínua
      isLoopActiveRef.current = true;
      let lastCheckTime = 0;
      const THROTTLE_MS = 85; // ~12 frames por segundo (captura piscadas e movimentos com alta precisão)

      const loop = async (time: number) => {
        if (!isLoopActiveRef.current) return;

        if (time - lastCheckTime >= THROTTLE_MS && videoRef.current) {
          lastCheckTime = time;
          const video = videoRef.current;

          if (video.readyState >= 2 && !video.paused && !video.ended) {
            try {
              const detection = await faceEngine.detectFace(video);
              setFaceCount(detection.faceCount);

              // Validação de presença do rosto
              if (detection.faceCount === 0) {
                setIsWellFramed(false);
                setStatusMessage("Não conseguimos detectar seu rosto.");
                setFeedbackText("Posicione-se confortavelmente em frente à câmera com boa iluminação.");
              } else if (detection.faceCount > 1) {
                setIsWellFramed(false);
                setStatusMessage("Deixe apenas uma pessoa diante da câmera.");
                setFeedbackText("Múltiplos rostos detectados. A validação exige apenas uma pessoa.");
              } else if (detection.faceCount === 1 && detection.box && detection.landmarks) {
                // Checa enquadramento adequado (tamanho mínimo e máximo razoável)
                const videoW = video.videoWidth || 640;
                const faceRatio = detection.box.width / videoW;
                const framed = faceRatio >= 0.10 && faceRatio <= 0.94;
                setIsWellFramed(framed);

                if (!framed) {
                  setStatusMessage("Ajuste a distância da câmera.");
                  setFeedbackText(
                    faceRatio < 0.10
                      ? "Aproxime-se um pouco mais da câmera."
                      : "Afaste-se um pouco da câmera."
                  );
                } else {
                  // Rosto detectado e bem enquadrado!
                  const currentSession = sessionManagerRef.current;
                  if (currentSession) {
                    const currentStep = currentSession.getCurrentStep();

                    if (!currentStep) {
                      // Todos os desafios já foram percorridos, dispara verificação final de PAD
                      setUiState("VALIDANDO");
                      setStatusMessage("Verificando...");
                      setFeedbackText("Analisando consistência temporal dos movimentos...");

                      isLoopActiveRef.current = false;
                      clearTimer();

                      const verdict = currentSession.generateFinalVerdict();

                      if (verdict.success && !verdict.spoofDetected) {
                        setUiState("SUCESSO");
                        setStatusMessage("Pessoa real confirmada.");
                        setFeedbackText("Verificação de presença concluída com sucesso!");

                        const photo = cameraService.captureSnapshot(video, {
                          maxWidth: 640,
                          quality: 0.88,
                        });

                        setTimeout(() => {
                          stopCamera();
                          onVerified(photo);
                        }, 1200);
                        return;
                      } else {
                        setUiState("FALHA");
                        setStatusMessage("Não foi possível confirmar sua presença.");
                        setFeedbackText(
                          verdict.reason || "Não foi possível confirmar que você é uma pessoa real."
                        );
                        stopCamera();
                        return;
                      }
                    }

                    // Se ainda está em AGUARDANDO_ROSTO, transita para DESAFIO_EM_ANDAMENTO
                    setUiState("DESAFIO_EM_ANDAMENTO");
                    setStatusMessage(currentStep.title);

                    // Extrai métricas do frame atual via LivenessService
                    const frameMetrics = detection.box
                      ? livenessService.extractMetrics(
                          detection.landmarks,
                          detection.expressions,
                          detection.box
                        )
                      : null;

                    if (frameMetrics) {
                      const evaluation = currentSession.evaluateFrame(frameMetrics);
                      setStepProgress(evaluation.progressPercent);
                      setFeedbackText(evaluation.feedbackText);

                      // Se o passo atual foi confirmado por múltiplos frames consecutivos:
                      if (evaluation.isStepComplete) {
                        const isFinished = currentSession.advanceStep();
                        setCurrentStepIndex(currentSession.currentStepIndex);
                        setStepProgress(0);

                        if (isFinished) {
                          // Finalizou todos os passos, entra em validação
                          setUiState("VALIDANDO");
                          setStatusMessage("Verificando...");
                          setFeedbackText("Analisando consistência temporal dos movimentos...");

                          isLoopActiveRef.current = false;
                          clearTimer();

                          const verdict = currentSession.generateFinalVerdict();

                          if (verdict.success && !verdict.spoofDetected) {
                            setUiState("SUCESSO");
                            setStatusMessage("Pessoa real confirmada.");
                            setFeedbackText("Verificação de presença concluída com sucesso!");

                            const photo = cameraService.captureSnapshot(video, {
                              maxWidth: 640,
                              quality: 0.88,
                            });

                            setTimeout(() => {
                              stopCamera();
                              onVerified(photo);
                            }, 1200);
                            return;
                          } else {
                            setUiState("FALHA");
                            setStatusMessage("Não foi possível confirmar sua presença.");
                            setFeedbackText(
                              verdict.reason || "Não foi possível confirmar que você é uma pessoa real."
                            );
                            stopCamera();
                            return;
                          }
                        }
                      }
                    }
                  }
                }
              }
            } catch (detectionErr) {
              console.warn("Aviso na detecção facial do frame:", detectionErr);
            }
          }
        }

        if (isLoopActiveRef.current) {
          animationFrameRef.current = requestAnimationFrame(loop);
        }
      };

      animationFrameRef.current = requestAnimationFrame(loop);
    } catch (err: unknown) {
      console.error("Erro ao iniciar sessão de liveness:", err);
      let msg = "Precisamos acessar sua câmera para realizar a verificação de presença.";
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        msg = "Permissão da webcam foi negada no navegador. Permita o uso da câmera para continuar.";
      }
      setCameraError(msg);
      setUiState("FALHA");
      setStatusMessage("Erro de acesso à câmera.");
      setFeedbackText(msg);
    }
  }, [clearTimer, onVerified, startTimer, stopCamera]);

  useEffect(() => {
    startSession();
    return () => {
      stopCamera();
    };
  }, [startSession, stopCamera]);

  const currentStep = steps[currentStepIndex];

  // Renderizador do ícone de instrução dinâmico
  const renderStepIcon = (type?: ChallengeStepType) => {
    switch (type) {
      case "blink_twice":
        return <Eye className="w-8 h-8 text-indigo-600 animate-pulse" />;
      case "turn_left":
        return <ArrowLeft className="w-8 h-8 text-indigo-600 animate-bounce" />;
      case "turn_right":
        return <ArrowRight className="w-8 h-8 text-indigo-600 animate-bounce" />;
      case "smile":
        return <Smile className="w-8 h-8 text-indigo-600 animate-pulse" />;
      case "return_center":
      case "look_center":
        return <UserCheck className="w-8 h-8 text-indigo-600" />;
      default:
        return <ShieldCheck className="w-8 h-8 text-indigo-600" />;
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-white border border-slate-200 rounded-3xl p-3 sm:p-6 md:p-8 shadow-sm">
      {/* Cabeçalho dinâmico */}
      <div className="text-center mb-4 sm:mb-5">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 mb-2 sm:mb-2.5 shadow-xs">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>
            {verificationReason === "CADASTRO_INICIAL"
              ? "Cadastro Biométrico Inicial (SISRU / Catraca)"
              : verificationReason === "AUDITORIA_ALEATORIA"
              ? "Confirmação Periódica de Segurança"
              : "Verificação de segurança"}
          </span>
        </div>

        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          {verificationReason === "CADASTRO_INICIAL"
            ? "Cadastre sua Biometria Facial"
            : "Confirmação de Presença"}
        </h2>
        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
          {verificationReason === "CADASTRO_INICIAL"
            ? "Complete a validação abaixo para registrar sua biometria e liberar seu acesso nas catracas."
            : verificationReason === "AUDITORIA_ALEATORIA"
            ? "Verificação de presença aleatória sorteada pelo sistema de segurança para revalidar seu acesso."
            : "Precisamos confirmar que você é uma pessoa real diante da câmera. Siga as instruções na tela."}
        </p>
      </div>

      {/* Temporizador e Etapas */}
      {uiState !== "SUCESSO" && uiState !== "FALHA" && (
        <div className="mb-3 flex items-center justify-between px-1 sm:px-2">
          {/* Indicador de passos */}
          <div className="flex items-center gap-1.5">
            {steps.map((s, idx) => (
              <div
                key={s.id}
                className={`h-2 rounded-full transition-all duration-300 ${
                  idx < currentStepIndex
                    ? "w-6 bg-emerald-500"
                    : idx === currentStepIndex
                    ? "w-8 bg-indigo-600"
                    : "w-3 bg-slate-200"
                }`}
                title={`Etapa ${idx + 1}: ${s.title}`}
              />
            ))}
            <span className="text-[11px] font-bold text-slate-500 ml-1">
              {currentStepIndex + 1}/{steps.length || 1}
            </span>
          </div>

          {/* Contador de tempo regressivo */}
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold ${
              remainingSeconds <= 15
                ? "bg-rose-50 text-rose-700 border border-rose-200 animate-pulse"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{remainingSeconds}s</span>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* NOVO LOCAL: CARTÃO DE INSTRUÇÃO DO DESAFIO ACIMA DA CÂMERA       */}
      {/* O usuário visualiza imediatamente a instrução antes de olhar      */}
      {/* ============================================================== */}
      {uiState !== "SUCESSO" && uiState !== "FALHA" && currentStep && (
        <div className="mb-3 sm:mb-4 p-3.5 sm:p-4 rounded-2xl bg-indigo-50/90 border border-indigo-200 shadow-xs flex items-center gap-3.5 sm:gap-4 transition-all">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-white border border-indigo-200 shadow-xs flex items-center justify-center shrink-0">
            {renderStepIcon(currentStep.type)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] sm:text-[11px] font-bold text-indigo-700 uppercase tracking-wider">
                Desafio {currentStepIndex + 1} de {steps.length}
              </span>
              {stepProgress > 0 && (
                <span className="text-[10px] font-bold text-indigo-600 font-mono">
                  {stepProgress}%
                </span>
              )}
            </div>

            <h3 className="text-sm font-bold text-slate-900 mt-0.5 truncate">
              {currentStep.title}
            </h3>
            <p className="text-xs text-slate-600 mt-0.5 font-medium">
              {feedbackText || currentStep.instruction}
            </p>

            {/* Barra de progresso da etapa */}
            <div className="w-full bg-indigo-100 rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className="bg-indigo-600 h-full transition-all duration-200 rounded-full"
                style={{ width: `${stepProgress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Box da Câmera com feedback visual ampliado para Mobile */}
      <div className="relative w-full aspect-[3/4] sm:aspect-[4/3] min-h-[380px] sm:min-h-[440px] max-h-[72vh] bg-slate-950 rounded-2xl sm:rounded-3xl overflow-hidden border-2 border-slate-200 shadow-md flex items-center justify-center">
        {/* Feed da Webcam com espelhamento horizontal amigável */}
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={`w-full h-full object-cover transform -scale-x-100 ${
            cameraError || uiState === "FALHA" ? "opacity-30" : "opacity-100"
          }`}
        />

        {/* Guia oval discreta de posicionamento facial */}
        {!cameraError && uiState !== "SUCESSO" && uiState !== "FALHA" && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div
              className={`w-56 h-72 sm:w-60 sm:h-76 rounded-[50%] border-2 transition-all duration-300 ${
                faceCount === 1 && isWellFramed
                  ? "border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.4)]"
                  : faceCount > 1
                  ? "border-rose-400 border-dashed"
                  : "border-white/50 border-dashed"
              }`}
            />
          </div>
        )}

        {/* Overlay para Estado: INICIANDO */}
        {uiState === "INICIANDO" && (
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center text-white">
            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mb-3" />
            <p className="text-sm font-semibold">{statusMessage}</p>
            <p className="text-xs text-slate-300 mt-1">Carregando módulos de visão computacional...</p>
          </div>
        )}

        {/* Overlay para Estado: VALIDANDO */}
        {uiState === "VALIDANDO" && (
          <div className="absolute inset-0 bg-slate-900/85 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center text-white animate-in fade-in duration-200">
            <Sparkles className="w-10 h-10 text-emerald-400 animate-bounce mb-3" />
            <p className="text-base font-bold">{statusMessage}</p>
            <p className="text-xs text-slate-300 mt-1 max-w-xs">{feedbackText}</p>
          </div>
        )}

        {/* Overlay para Estado: SUCESSO */}
        {uiState === "SUCESSO" && (
          <div className="absolute inset-0 bg-emerald-950/90 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center text-white animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 border-2 border-emerald-400 text-emerald-300 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <h3 className="text-lg font-black tracking-tight text-emerald-200">
              Pessoa real confirmada.
            </h3>
            <p className="text-xs text-emerald-300/80 mt-1">
              Verificação concluída. Liberando painel...
            </p>
          </div>
        )}

        {/* Overlay para Estado: FALHA */}
        {uiState === "FALHA" && (
          <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center text-white animate-in fade-in duration-200">
            <div className="w-14 h-14 rounded-full bg-rose-500/20 border-2 border-rose-400 text-rose-300 flex items-center justify-center mb-3">
              <AlertTriangle className="w-8 h-8 text-rose-400" />
            </div>
            <h3 className="text-base font-bold text-rose-200">
              {statusMessage}
            </h3>
            <p className="text-xs text-slate-300 mt-1.5 max-w-xs leading-relaxed">
              {feedbackText}
            </p>

            <div className="mt-5 flex items-center gap-3">
              <button
                type="button"
                onClick={startSession}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition active:scale-95 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Tentar novamente</span>
              </button>

              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Nota técnica de segurança discreta */}
      <div className="mt-4 pt-3 border-t border-slate-100 text-center">
        <p className="text-[11px] text-slate-400">
          Apresentações estáticas (fotos impressas ou capturas de tela) são bloqueadas por validação temporal de múltiplos frames.
        </p>
      </div>
    </div>
  );
}

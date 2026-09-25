"use client";

import React, { useState, useCallback } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  RecognitionState,
  RecognizedPersonData,
  AccessAuthorization,
} from "@/components/RecognitionCameraView";
import { DominantEmotion } from "@/lib/face-api";
import {
  ScanFace,
  CheckCircle,
  Clock,
  UserCheck,
  UserPlus,
  ArrowLeft,
  Users,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  Sparkles,
  Eye,
  AlertTriangle,
  UserX,
  Lock,
  Unlock,
} from "lucide-react";

const RecognitionCameraView = dynamic(
  () =>
    import("@/components/RecognitionCameraView").then(
      (mod) => mod.RecognitionCameraView
    ),
  {
    ssr: false,
    loading: () => (
      <div className="w-full max-w-xl aspect-[4/3] bg-white rounded-2xl border-2 border-slate-200 flex flex-col items-center justify-center p-6 text-center shadow-sm">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-3" />
        <p className="text-sm font-semibold text-slate-700">
          Iniciando câmera e modelos de Liveness...
        </p>
      </div>
    ),
  }
);

interface AuthorizationLog {
  id: string;
  name: string;
  time: string;
  decision: "GRANTED" | "BLOCKED";
  reason: string;
  confidence?: number;
  emotion?: DominantEmotion | null;
  livenessAction?: string | null;
}

export default function ReconhecimentoPage() {
  const [recognitionState, setRecognitionState] = useState<RecognitionState>({
    status: "initializing",
    message: "Iniciando câmera...",
    faceCount: 0,
    match: null,
    currentEmotion: null,
    livenessStage: "idle",
    livenessAction: null,
    decision: "PENDING",
  });

  const [authData, setAuthData] = useState<AccessAuthorization>({
    livenessApproved: false,
    livenessStage: "idle",
    livenessAction: null,
    isRegistered: false,
    decision: "PENDING",
    message: "Posicione-se diante da câmera para iniciar a verificação.",
    person: null,
  });

  const [history, setHistory] = useState<AuthorizationLog[]>([]);

  // Quando ocorre atualização no estado de autorização e liveness
  const handleAuthorizationChange = useCallback((auth: AccessAuthorization) => {
    setAuthData(auth);

    const now = new Date().toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    if (auth.decision === "GRANTED" && auth.person) {
      const person = auth.person;
      setHistory((prev) => {
        // Evita duplicar o mesmo nome em curto intervalo
        if (prev.length > 0 && prev[0].name === person.name && prev[0].decision === "GRANTED") {
          return prev;
        }
        return [
          {
            id: `${person.id}-${Date.now()}`,
            name: person.name,
            time: now,
            decision: "GRANTED",
            reason: "Liveness Aprovado + Pessoa Cadastrada",
            confidence: person.confidence,
            emotion: person.emotion,
            livenessAction: auth.livenessAction,
          },
          ...prev.slice(0, 9),
        ];
      });
    } else if (auth.decision === "BLOCKED" && (auth.livenessStage === "passed" || auth.livenessStage === "failed")) {
      const isUnregistered = auth.livenessStage === "passed" && !auth.isRegistered;
      const isLivenessFail = auth.livenessStage === "failed";
      const subjectName = isUnregistered ? "Pessoa Não Cadastrada" : "Presença Não Confirmada";
      const reasonText = isUnregistered
        ? "Liveness Aprovado, mas não cadastrado no banco"
        : "Liveness Reprovado (Ausência de movimento real)";

      setHistory((prev) => {
        if (prev.length > 0 && prev[0].name === subjectName && (Date.now() - Number(prev[0].id.split("-")[1] || 0) < 4000)) {
          return prev;
        }
        return [
          {
            id: `blocked-${Date.now()}`,
            name: subjectName,
            time: now,
            decision: "BLOCKED",
            reason: reasonText,
            livenessAction: auth.livenessAction,
          },
          ...prev.slice(0, 9),
        ];
      });
    }
  }, []);

  const getEmotionBadgeColor = (name?: string) => {
    switch (name) {
      case "happy":
        return "bg-emerald-50 text-emerald-800 border-emerald-300";
      case "neutral":
        return "bg-slate-100 text-slate-800 border-slate-300";
      case "sad":
        return "bg-blue-50 text-blue-800 border-blue-300";
      case "angry":
        return "bg-rose-50 text-rose-800 border-rose-300";
      case "surprised":
        return "bg-amber-50 text-amber-800 border-amber-300";
      case "fearful":
        return "bg-purple-50 text-purple-800 border-purple-300";
      case "disgusted":
        return "bg-orange-50 text-orange-800 border-orange-300";
      default:
        return "bg-slate-100 text-slate-700 border-slate-300";
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-16">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 text-xs font-semibold uppercase tracking-wider mb-1">
            <Link href="/" className="hover:underline flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Voltar ao início
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <ScanFace className="w-8 h-8 text-indigo-600" />
            Controle de Acesso com Liveness e Reconhecimento
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Validação estrita em duas etapas: confirmação de pessoa real (Anti-Spoofing) + verificação no banco de dados.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/cadastro"
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            Cadastrar pessoa
          </Link>
          <Link
            href="/cadastros"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition border border-slate-300 shadow-sm"
          >
            <Users className="w-4 h-4" />
            Ver lista
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Coluna da Câmera (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col items-center">
          <div className="w-full flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                Câmera de Acesso Exclusiva
              </h2>
            </div>
            <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-sky-600" />
              Anti-Spoofing Ativo
            </span>
          </div>

          <RecognitionCameraView
            onRecognitionChange={setRecognitionState}
            onAuthorizationChange={handleAuthorizationChange}
          />

          {/* Duas Etapas em Indicadores Visuais */}
          <div className="mt-5 w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Etapa 1: Liveness */}
            <div
              className={`p-3.5 rounded-2xl border transition ${
                authData.livenessStage === "passed"
                  ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                  : authData.livenessStage === "verifying"
                  ? "bg-sky-50 border-sky-300 text-sky-900 animate-pulse"
                  : authData.livenessStage === "failed"
                  ? "bg-rose-50 border-rose-300 text-rose-900"
                  : "bg-slate-50 border-slate-200 text-slate-600"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  Etapa 1: Liveness
                </span>
                {authData.livenessStage === "passed" ? (
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                ) : authData.livenessStage === "verifying" ? (
                  <Eye className="w-4 h-4 text-sky-600 animate-spin" />
                ) : authData.livenessStage === "failed" ? (
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                ) : (
                  <Clock className="w-4 h-4 text-slate-400" />
                )}
              </div>
              <div className="text-xs font-semibold">
                {authData.livenessStage === "passed"
                  ? `Presença Confirmada (${authData.livenessAction || "Pessoa Real"})`
                  : authData.livenessStage === "verifying"
                  ? "Aguardando piscar ou sorrir..."
                  : authData.livenessStage === "failed"
                  ? "Reprovado (Sem movimento real)"
                  : "Aguardando rosto diante da lente"}
              </div>
            </div>

            {/* Etapa 2: Face Match */}
            <div
              className={`p-3.5 rounded-2xl border transition ${
                authData.decision === "GRANTED"
                  ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                  : authData.livenessStage === "passed" && !authData.isRegistered
                  ? "bg-amber-50 border-amber-300 text-amber-900"
                  : "bg-slate-50 border-slate-200 text-slate-600"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  Etapa 2: Base de Dados
                </span>
                {authData.decision === "GRANTED" ? (
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                ) : authData.livenessStage === "passed" && !authData.isRegistered ? (
                  <UserX className="w-4 h-4 text-amber-600" />
                ) : (
                  <Lock className="w-4 h-4 text-slate-400" />
                )}
              </div>
              <div className="text-xs font-semibold">
                {authData.decision === "GRANTED"
                  ? `Pessoa Cadastrada (${authData.person?.name})`
                  : authData.livenessStage === "passed" && !authData.isRegistered
                  ? "Pessoa Não Cadastrada no Banco"
                  : "Aguardando validação de Liveness"}
              </div>
            </div>
          </div>
        </div>

        {/* Coluna de Decisão de Autorização e Histórico (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card: Painel de Decisão Final */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              Decisão de Acesso do Sistema
            </h3>

            {/* CENÁRIO 1: ACESSO LIBERADO (LIVENESS OK + CADASTRADO) */}
            {authData.decision === "GRANTED" && authData.person ? (
              <div className="p-6 rounded-2xl bg-emerald-50 border-2 border-emerald-300 text-slate-900 animate-in zoom-in-95 duration-200 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
                    <Unlock className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300 inline-block mb-0.5">
                      Condição 1 + 2 Atendidas
                    </span>
                    <h4 className="text-2xl font-black text-emerald-950 tracking-tight">
                      ACESSO LIBERADO
                    </h4>
                  </div>
                </div>

                <div className="bg-white/80 rounded-xl p-4 border border-emerald-200 mb-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium">Nome:</span>
                    <span className="text-base font-extrabold text-slate-900">
                      {authData.person.name}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium">Liveness:</span>
                    <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" />
                      {authData.livenessAction || "Confirmado (Pessoa Real)"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium">Similaridade Facial:</span>
                    <span className="text-xs font-mono font-bold text-emerald-700">
                      {authData.person.confidence}% (Dist: {authData.person.distance})
                    </span>
                  </div>
                  {authData.person.emotion && (
                    <div className="flex items-center justify-between pt-1 border-t border-emerald-100">
                      <span className="text-xs text-slate-500 font-medium">Humor Detectado:</span>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold border ${getEmotionBadgeColor(
                          authData.person.emotion.name
                        )}`}
                      >
                        <span>{authData.person.emotion.emoji}</span>
                        <span>{authData.person.emotion.label}</span>
                      </span>
                    </div>
                  )}
                </div>

                <p className="text-[11px] text-emerald-800 text-center font-semibold">
                  ✓ Pessoa real identificada e autorizada no SQLite.
                </p>
              </div>
            ) : authData.decision === "BLOCKED" && authData.livenessStage === "passed" && !authData.isRegistered ? (
              /* CENÁRIO 2: ACESSO BLOQUEADO (LIVENESS OK + NÃO CADASTRADO) */
              <div className="p-6 rounded-2xl bg-amber-50 border-2 border-amber-300 text-slate-900 animate-in zoom-in-95 duration-200 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-600 text-white flex items-center justify-center shadow-md">
                    <Lock className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300 inline-block mb-0.5">
                      Pessoa Não Cadastrada
                    </span>
                    <h4 className="text-2xl font-black text-amber-950 tracking-tight">
                      ACESSO BLOQUEADO
                    </h4>
                  </div>
                </div>

                <div className="bg-white/80 rounded-xl p-4 border border-amber-200 mb-3 text-xs space-y-2 text-slate-700">
                  <div className="flex items-center justify-between">
                    <span>Validação de Vivacidade:</span>
                    <span className="font-bold text-emerald-700">✓ Aprovado (Pessoa Real)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Correspondência no Banco:</span>
                    <span className="font-bold text-amber-700">Nenhum registro encontrado</span>
                  </div>
                </div>

                <p className="text-xs text-amber-800 leading-relaxed">
                  A presença de uma pessoa real foi confirmada, mas o rosto não possui cadastro autorizado no banco de dados.
                </p>
              </div>
            ) : authData.decision === "BLOCKED" && authData.livenessStage === "failed" ? (
              /* CENÁRIO 3: ACESSO BLOQUEADO (LIVENESS REPROVADO / POSSÍVEL SPOOFING) */
              <div className="p-6 rounded-2xl bg-rose-50 border-2 border-rose-300 text-slate-900 animate-in zoom-in-95 duration-200 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-md">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-rose-800 bg-rose-100 px-2 py-0.5 rounded-full border border-rose-300 inline-block mb-0.5">
                      Anti-Spoofing Reprovado
                    </span>
                    <h4 className="text-2xl font-black text-rose-950 tracking-tight">
                      ACESSO BLOQUEADO
                    </h4>
                  </div>
                </div>

                <div className="bg-white/80 rounded-xl p-4 border border-rose-200 mb-3 text-xs space-y-2 text-slate-700">
                  <div className="flex items-center justify-between">
                    <span>Validação de Vivacidade:</span>
                    <span className="font-bold text-rose-600">✗ Não Confirmada</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Motivo:</span>
                    <span className="font-medium text-rose-800">
                      {authData.livenessAction || "Ausência de movimento natural"}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-rose-700 leading-relaxed">
                  Não foi possível confirmar a presença de uma pessoa real diante da lente. Fotografias estáticas ou telas não liberam o acesso.
                </p>
              </div>
            ) : (
              /* CENÁRIO 4: AGUARDANDO VERIFICAÇÃO */
              <div className="p-8 rounded-2xl bg-slate-50 border border-dashed border-slate-300 text-center">
                <ScanFace className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-60" />
                <p className="text-sm font-semibold text-slate-700">
                  Aguardando posicionamento
                </p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                  Posicione-se diante da câmera. O sistema solicitará um movimento natural (piscar ou sorrir) e validará seu cadastro.
                </p>
              </div>
            )}
          </div>

          {/* Card: Histórico de Tentativas da Sessão */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" />
              Histórico de Decisões da Sessão
            </h3>

            {history.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">
                Nenhum evento registrado nesta sessão ainda.
              </p>
            ) : (
              <div className="space-y-2.5">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between p-3 rounded-xl border text-xs transition ${
                      item.decision === "GRANTED"
                        ? "bg-emerald-50/50 border-emerald-200 hover:bg-emerald-50"
                        : "bg-rose-50/40 border-rose-200 hover:bg-rose-50"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-8 h-8 rounded-xl font-bold flex items-center justify-center text-sm ${
                          item.decision === "GRANTED"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {item.decision === "GRANTED" ? (
                          item.emotion ? item.emotion.emoji : "✓"
                        ) : (
                          "✗"
                        )}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-900 block">
                          {item.name}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {item.time} • {item.reason}
                        </span>
                      </div>
                    </div>

                    <div>
                      <span
                        className={`px-2 py-0.5 rounded-md font-bold text-[11px] uppercase border ${
                          item.decision === "GRANTED"
                            ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                            : "bg-rose-100 text-rose-800 border-rose-300"
                        }`}
                      >
                        {item.decision === "GRANTED" ? "Liberado" : "Bloqueado"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

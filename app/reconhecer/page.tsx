"use client";

import React, { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  RecognitionState,
  RecognizedPersonData,
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
  Loader2,
  Sparkles,
  Smile,
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
          Iniciando câmera para reconhecimento...
        </p>
      </div>
    ),
  }
);

interface RecognitionLog {
  id: string;
  name: string;
  time: string;
  confidence: number;
  emotion?: DominantEmotion | null;
}

export default function ReconhecimentoPage() {
  const [recognitionState, setRecognitionState] = useState<RecognitionState>({
    status: "initializing",
    message: "Iniciando câmera...",
    faceCount: 0,
    match: null,
    currentEmotion: null,
  });

  const [lastMatch, setLastMatch] = useState<RecognizedPersonData | null>(null);
  const [history, setHistory] = useState<RecognitionLog[]>([]);

  // Quando alguém for reconhecido com sucesso
  const handleRecognized = React.useCallback((person: RecognizedPersonData) => {
    setLastMatch(person);

    const now = new Date().toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    setHistory((prev) => {
      // Evita duplicar o mesmo nome em menos de 3 segundos
      if (prev.length > 0 && prev[0].name === person.name) {
        return prev;
      }
      return [
        {
          id: `${person.id}-${Date.now()}`,
          name: person.name,
          time: now,
          confidence: person.confidence,
          emotion: person.emotion,
        },
        ...prev.slice(0, 7), // Mantém últimos 8 registros
      ];
    });
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
            Reconhecimento Facial e Análise de Humor
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Identificação biométrica em tempo real com detecção de expressões faciais (feliz, normal, triste, raiva).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/cadastro"
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            Novo cadastro
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
                Monitor Biométrico
              </h2>
            </div>
            <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
              <Smile className="w-3.5 h-3.5 text-indigo-600" />
              Reconhecimento + Humor Ativo
            </span>
          </div>

          <RecognitionCameraView
            onRecognitionChange={setRecognitionState}
            onRecognizedEvent={handleRecognized}
          />

          <div className="mt-5 w-full bg-slate-50 rounded-2xl p-4 border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>
                Identificação facial instantânea com classificação de humor em tempo real.
              </span>
            </div>
            <span className="font-semibold text-slate-700">
              face-api neural net
            </span>
          </div>
        </div>

        {/* Coluna de Resultados e Histórico (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card: Última Identificação */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-indigo-600" />
              Última Identificação
            </h3>

            {lastMatch ? (
              <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-slate-900 animate-in zoom-in-95 duration-200">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 mb-2">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                      Reconhecido com Sucesso
                    </span>
                    <h4 className="text-xl font-extrabold text-slate-900 tracking-tight">
                      {lastMatch.name}
                    </h4>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      ID: {lastMatch.id.substring(0, 14)}...
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-emerald-700">
                      {lastMatch.confidence}%
                    </span>
                    <span className="block text-[10px] text-emerald-600 font-semibold uppercase">
                      Similaridade
                    </span>
                  </div>
                </div>

                {/* Exibição do Humor / Expressão Facial */}
                {lastMatch.emotion && (
                  <div className="mt-4 pt-3 border-t border-emerald-200/80 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">
                      Humor Detectado:
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border ${getEmotionBadgeColor(
                        lastMatch.emotion.name
                      )}`}
                    >
                      <span className="text-base">{lastMatch.emotion.emoji}</span>
                      <span>{lastMatch.emotion.label}</span>
                      <span className="text-[10px] opacity-75 font-mono">
                        ({lastMatch.emotion.probability}%)
                      </span>
                    </span>
                  </div>
                )}

                <div className="mt-3 pt-3 border-t border-emerald-200/80 flex items-center justify-between text-xs text-slate-600">
                  <span className="flex items-center gap-1 font-medium text-emerald-800">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Acesso Permitido
                  </span>
                  <span className="font-mono text-slate-500">
                    Distância: {lastMatch.distance}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-8 rounded-2xl bg-slate-50 border border-dashed border-slate-300 text-center">
                <ScanFace className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-60" />
                <p className="text-sm font-semibold text-slate-700">
                  Aguardando rosto...
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Assim que um rosto for detectado, o nome e o humor aparecerão aqui.
                </p>
              </div>
            )}
          </div>

          {/* Card: Histórico da Sessão com Humor */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" />
              Reconhecimentos Recentes da Sessão
            </h3>

            {history.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">
                Nenhum reconhecimento registrado nesta sessão.
              </p>
            ) : (
              <div className="space-y-2.5">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs transition hover:bg-slate-100"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-sm">
                        {item.emotion ? item.emotion.emoji : item.name.charAt(0)}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-800 block">
                          {item.name}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {item.time} {item.emotion && `• ${item.emotion.label}`}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        {item.confidence}%
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

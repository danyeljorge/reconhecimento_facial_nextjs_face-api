"use client";

import React, { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { CameraState } from "@/components/CameraView";
import {
  UserCheck,
  Loader2,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  UserPlus,
  ArrowLeft,
  ScanFace,
} from "lucide-react";

// Importa CameraView com SSR desabilitado para execução exclusiva no navegador do cliente
const CameraView = dynamic(
  () => import("@/components/CameraView").then((mod) => mod.CameraView),
  {
    ssr: false,
    loading: () => (
      <div className="w-full max-w-lg aspect-[4/3] bg-white rounded-2xl border-2 border-slate-200 flex flex-col items-center justify-center p-6 text-center shadow-sm">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-3" />
        <p className="text-sm font-semibold text-slate-700">
          Iniciando câmera para cadastro...
        </p>
      </div>
    ),
  }
);

export default function CadastroPage() {
  const [name, setName] = useState<string>("");
  const [nameTouched, setNameTouched] = useState<boolean>(false);
  const [cameraState, setCameraState] = useState<CameraState>({
    status: "initializing",
    message: "Aguardando câmera...",
    faceCount: 0,
    descriptor: null,
    isReady: false,
  });

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [registeredPerson, setRegisteredPerson] = useState<{
    id: string;
    name: string;
    createdAt: string;
  } | null>(null);

  const isNameEmpty = name.trim().length === 0;
  const isNameTooShort = name.trim().length > 0 && name.trim().length < 2;
  const isNameTooLong = name.trim().length > 150;
  const isNameValid = !isNameEmpty && !isNameTooShort && !isNameTooLong;

  const canSubmit =
    isNameValid &&
    cameraState.status === "one_face" &&
    cameraState.descriptor !== null &&
    cameraState.descriptor.length === 128 &&
    !isSubmitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch("/api/persons", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          faceDescriptor: cameraState.descriptor,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Não foi possível realizar o cadastro. Tente novamente.");
      }

      setRegisteredPerson(data.person);
    } catch (err: unknown) {
      console.error("Erro no envio:", err);
      if (err instanceof Error) {
        setSubmitError(err.message);
      } else {
        setSubmitError("Não foi possível realizar o cadastro. Tente novamente.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForNewRegistration = () => {
    setName("");
    setNameTouched(false);
    setSubmitError(null);
    setRegisteredPerson(null);
  };

  return (
    <div className="max-w-4xl mx-auto pb-16">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 text-xs font-semibold uppercase tracking-wider mb-1">
            <Link href="/" className="hover:underline flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Voltar ao início
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Cadastrar Pessoa
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Capture a biometria facial via webcam para gerar e armazenar o Face Descriptor no SQLite.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/reconhecer"
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition border border-indigo-200"
          >
            <ScanFace className="w-3.5 h-3.5" />
            Testar reconhecimento
          </Link>
          <Link
            href="/cadastros"
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 rounded-xl transition border border-slate-300 shadow-sm"
          >
            Ver cadastros
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Alerta de Sucesso após Cadastro */}
      {registeredPerson ? (
        <div className="bg-white border-2 border-emerald-200 rounded-3xl p-8 text-center max-w-xl mx-auto shadow-sm animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-200">
            <CheckCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            Pessoa cadastrada com sucesso!
          </h2>
          <p className="text-sm text-slate-600 mb-2">
            A identidade biométrica de{" "}
            <span className="font-semibold text-emerald-700">
              {registeredPerson.name}
            </span>{" "}
            foi salva no banco de dados SQLite.
          </p>
          <p className="text-xs text-slate-400 mb-6 font-mono">
            ID: {registeredPerson.id}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/reconhecer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow-sm"
            >
              <ScanFace className="w-4 h-4" />
              Reconhecer agora
            </Link>
            <button
              onClick={handleResetForNewRegistration}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition border border-slate-200"
            >
              <UserPlus className="w-4 h-4" />
              Cadastrar outra pessoa
            </button>
          </div>
        </div>
      ) : (
        /* Formulário e Câmera de Cadastro */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Coluna da Câmera (7 cols) */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2 uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-indigo-600" />
              Câmera Biométrica
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Enquadre o rosto da pessoa. O sistema validará se há exatamente 1 face.
            </p>

            <CameraView
              onStateChange={setCameraState}
              disabled={isSubmitting}
            />

            <div className="mt-5 grid grid-cols-2 gap-2 text-xs">
              <div
                className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                  cameraState.status === "one_face"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-slate-50 border-slate-200 text-slate-400"
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full ${
                    cameraState.status === "one_face"
                      ? "bg-emerald-500 animate-pulse"
                      : "bg-slate-300"
                  }`}
                />
                <span className="font-medium">Exatamente 1 rosto</span>
              </div>

              <div
                className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                  cameraState.descriptor
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-slate-50 border-slate-200 text-slate-400"
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full ${
                    cameraState.descriptor ? "bg-emerald-500" : "bg-slate-300"
                  }`}
                />
                <span className="font-medium">Descriptor 128D gerado</span>
              </div>
            </div>
          </div>

          {/* Coluna do Formulário e Validações (5 cols) */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="full-name"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2"
                >
                  Nome completo <span className="text-rose-500">*</span>
                </label>
                <input
                  id="full-name"
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!nameTouched) setNameTouched(true);
                  }}
                  onBlur={() => setNameTouched(true)}
                  disabled={isSubmitting}
                  placeholder="Ex: João da Silva"
                  className={`w-full px-4 py-3 bg-slate-50 border rounded-2xl text-slate-900 placeholder-slate-400 text-sm focus:bg-white focus:outline-none focus:ring-2 transition ${
                    nameTouched && !isNameValid
                      ? "border-rose-300 focus:ring-rose-500/20"
                      : "border-slate-300 focus:border-indigo-600 focus:ring-indigo-600/10"
                  }`}
                />

                {nameTouched && isNameEmpty && (
                  <p className="text-xs text-rose-600 mt-1.5 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3.5 h-3.5" />
                    O nome não pode estar vazio.
                  </p>
                )}
                {nameTouched && isNameTooShort && (
                  <p className="text-xs text-rose-600 mt-1.5 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3.5 h-3.5" />
                    O nome deve conter pelo menos 2 caracteres.
                  </p>
                )}
                {nameTouched && isNameTooLong && (
                  <p className="text-xs text-rose-600 mt-1.5 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3.5 h-3.5" />
                    O nome excede 150 caracteres.
                  </p>
                )}
              </div>

              {/* Checklist de Requisitos */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Condições para Cadastro:
                </p>
                <ul className="text-xs space-y-1.5">
                  <li
                    className={`flex items-center gap-2 ${
                      isNameValid ? "text-emerald-700 font-medium" : "text-slate-400"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isNameValid ? "bg-emerald-500" : "bg-slate-300"
                      }`}
                    />
                    Nome preenchido corretamente
                  </li>
                  <li
                    className={`flex items-center gap-2 ${
                      cameraState.status !== "error" &&
                      cameraState.status !== "initializing" &&
                      cameraState.status !== "loading_models"
                        ? "text-emerald-700 font-medium"
                        : "text-slate-400"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        cameraState.status !== "error" &&
                        cameraState.status !== "initializing" &&
                        cameraState.status !== "loading_models"
                          ? "bg-emerald-500"
                          : "bg-slate-300"
                      }`}
                    />
                    Câmera ativa e modelos prontos
                  </li>
                  <li
                    className={`flex items-center gap-2 ${
                      cameraState.status === "one_face"
                        ? "text-emerald-700 font-medium"
                        : "text-slate-400"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        cameraState.status === "one_face"
                          ? "bg-emerald-500"
                          : "bg-slate-300"
                      }`}
                    />
                    Exatamente 1 rosto na câmera
                  </li>
                  <li
                    className={`flex items-center gap-2 ${
                      cameraState.descriptor !== null
                        ? "text-emerald-700 font-medium"
                        : "text-slate-400"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        cameraState.descriptor !== null
                          ? "bg-emerald-500"
                          : "bg-slate-300"
                      }`}
                    />
                    Face Descriptor 128D extraído
                  </li>
                </ul>
              </div>

              {submitError && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block mb-0.5">Erro no cadastro:</span>
                    <span>{submitError}</span>
                  </div>
                </div>
              )}

              {/* Botão de Envio */}
              <button
                type="submit"
                disabled={!canSubmit}
                className={`w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl text-sm font-bold transition duration-200 ${
                  canSubmit
                    ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 cursor-pointer"
                    : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Salvando biometria...</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="w-4 h-4" />
                    <span>Capturar e cadastrar</span>
                  </>
                )}
              </button>

              <div className="text-[11px] text-slate-400 text-center leading-relaxed">
                A foto nunca é enviada ao servidor. Apenas o vetor numérico (Face Descriptor) é salvo no SQLite local.
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

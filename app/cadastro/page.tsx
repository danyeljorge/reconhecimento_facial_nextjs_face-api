"use client";

import React, { useState, useRef, useEffect } from "react";
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
  Upload,
  Image as ImageIcon,
  Camera,
  RefreshCw,
  X,
  Sparkles,
} from "lucide-react";

// Importa CameraView com SSR desabilitado para modo opcional de webcam
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

type RegisterMode = "photo" | "webcam";

export default function CadastroPage() {
  const [mode, setMode] = useState<RegisterMode>("photo");
  const [name, setName] = useState<string>("");
  const [nameTouched, setNameTouched] = useState<boolean>(false);

  // Estado do Cadastro por Foto (Momento 1)
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [photoAnalyzing, setPhotoAnalyzing] = useState<boolean>(false);
  const [photoStatus, setPhotoStatus] = useState<"idle" | "analyzing" | "valid" | "error">("idle");
  const [photoMessage, setPhotoMessage] = useState<string>("");
  const [photoDescriptor, setPhotoDescriptor] = useState<number[] | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previewImageRef = useRef<HTMLImageElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Estado da Webcam (modo alternativo)
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

  // Carrega modelos face-api antecipadamente quando a página abre no navegador
  useEffect(() => {
    import("@/lib/face-api")
      .then(({ loadFaceApiModels }) => loadFaceApiModels("/models"))
      .catch((err) => {
        console.error("Erro ao pré-carregar modelos faciais:", err);
      });
  }, []);

  const isNameEmpty = name.trim().length === 0;
  const isNameTooShort = name.trim().length > 0 && name.trim().length < 2;
  const isNameTooLong = name.trim().length > 150;
  const isNameValid = !isNameEmpty && !isNameTooShort && !isNameTooLong;

  // O descriptor ativo depende do modo selecionado
  const activeDescriptor = mode === "photo" ? photoDescriptor : cameraState.descriptor;

  const canSubmit =
    isNameValid &&
    activeDescriptor !== null &&
    activeDescriptor.length === 128 &&
    !isSubmitting &&
    (mode === "photo" ? photoStatus === "valid" : cameraState.status === "one_face");

  // Processa a foto enviada pelo usuário
  const processImageFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setPhotoStatus("error");
      setPhotoMessage("Por favor, selecione um arquivo de imagem válido (JPG, PNG, WebP).");
      setPhotoDescriptor(null);
      return;
    }

    setPhotoFile(file);
    const previewUrl = URL.createObjectURL(file);
    setPhotoPreviewUrl(previewUrl);
    setPhotoAnalyzing(true);
    setPhotoStatus("analyzing");
    setPhotoMessage("Carregando modelos e analisando imagem...");
    setPhotoDescriptor(null);
    setSubmitError(null);

    // Cria elemento de imagem na memória para detecção
    const img = new Image();
    img.src = previewUrl;

    img.onload = async () => {
      try {
        const { detectFaceInImage, getFaceApi } = await import("@/lib/face-api");
        const result = await detectFaceInImage(img, 0.5);

        if (!result.success || !result.descriptor) {
          setPhotoStatus("error");
          setPhotoMessage(result.error || "Não foi possível validar o rosto na imagem.");
          setPhotoDescriptor(null);

          // Limpa canvas se houver
          if (previewCanvasRef.current) {
            const ctx = previewCanvasRef.current.getContext("2d");
            if (ctx) ctx.clearRect(0, 0, previewCanvasRef.current.width, previewCanvasRef.current.height);
          }
        } else {
          setPhotoStatus("valid");
          setPhotoMessage("Rosto identificado. Cadastro facial pronto para ser salvo!");
          setPhotoDescriptor(result.descriptor);

          // Desenha caixa verde e landmarks no canvas de preview
          if (previewCanvasRef.current && result.detection) {
            const canvas = previewCanvasRef.current;
            const faceapi = await getFaceApi();
            canvas.width = img.naturalWidth || img.width;
            canvas.height = img.naturalHeight || img.height;

            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              const box = result.detection.detection.box;
              ctx.strokeStyle = "#10b981";
              ctx.lineWidth = Math.max(3, Math.round(canvas.width / 150));
              ctx.strokeRect(box.x, box.y, box.width, box.height);

              ctx.fillStyle = "#10b981";
              result.detection.landmarks.positions.forEach((pt: { x: number; y: number }) => {
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, Math.max(2, Math.round(canvas.width / 300)), 0, 2 * Math.PI);
                ctx.fill();
              });
            }
          }
        }
      } catch (err: unknown) {
        console.error("Erro ao analisar imagem:", err);
        setPhotoStatus("error");
        setPhotoMessage("Erro ao processar imagem facial. Tente uma foto com melhor nitidez e iluminação.");
        setPhotoDescriptor(null);
      } finally {
        setPhotoAnalyzing(false);
      }
    };

    img.onerror = () => {
      setPhotoStatus("error");
      setPhotoMessage("Falha ao abrir a imagem. Tente outro arquivo.");
      setPhotoDescriptor(null);
      setPhotoAnalyzing(false);
    };
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleClearPhoto = () => {
    setPhotoFile(null);
    if (photoPreviewUrl) {
      URL.revokeObjectURL(photoPreviewUrl);
    }
    setPhotoPreviewUrl(null);
    setPhotoStatus("idle");
    setPhotoMessage("");
    setPhotoDescriptor(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !activeDescriptor) return;

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
          faceDescriptor: activeDescriptor,
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
    handleClearPhoto();
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
            Envie uma foto da pessoa para gerar o Face Descriptor de referência e salvar no banco de dados.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/reconhecer"
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition border border-indigo-200"
          >
            <ScanFace className="w-3.5 h-3.5" />
            Acesso via Câmera
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
            Rosto identificado e referência biométrica de{" "}
            <span className="font-semibold text-emerald-700">
              {registeredPerson.name}
            </span>{" "}
            salva no banco de dados SQLite.
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
              Reconhecer pela câmera
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
        /* Formulário e Captura */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Coluna da Imagem / Câmera (7 cols) */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            {/* Seletor de Modo: Foto (Padrão) vs Câmera */}
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-600" />
                Referência Facial
              </h2>

              <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setMode("photo")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                    mode === "photo"
                      ? "bg-white text-indigo-700 shadow-sm font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  Enviar Foto
                </button>
                <button
                  type="button"
                  onClick={() => setMode("webcam")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                    mode === "webcam"
                      ? "bg-white text-indigo-700 shadow-sm font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  Usar Webcam
                </button>
              </div>
            </div>

            {mode === "photo" ? (
              /* MOMENTO 1: CADASTRO POR UPLOAD DE FOTO */
              <div className="flex flex-col items-center w-full">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  className="hidden"
                />

                {!photoPreviewUrl ? (
                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full aspect-[4/3] max-w-lg border-2 border-dashed border-slate-300 hover:border-indigo-500 bg-slate-50 hover:bg-indigo-50/30 rounded-2xl flex flex-col items-center justify-center p-6 text-center cursor-pointer transition group"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 group-hover:border-indigo-300 flex items-center justify-center text-indigo-600 mb-4 shadow-sm group-hover:scale-105 transition-transform">
                      <ImageIcon className="w-8 h-8" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-800 mb-1">
                      Foto facial da pessoa
                    </h3>
                    <p className="text-xs text-slate-500 max-w-xs mb-4">
                      Selecione uma imagem frontal e nítida contendo exatamente uma pessoa.
                    </p>
                    <span className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 group-hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition shadow-sm">
                      <Upload className="w-3.5 h-3.5" />
                      Selecionar foto
                    </span>
                    <span className="text-[11px] text-slate-400 mt-3">
                      PNG, JPG ou WebP de até 10MB
                    </span>
                  </div>
                ) : (
                  <div className="w-full flex flex-col items-center">
                    <div className="relative w-full max-w-lg aspect-[4/3] bg-slate-900 rounded-2xl overflow-hidden border-2 border-slate-200 shadow-md flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        ref={previewImageRef}
                        src={photoPreviewUrl}
                        alt="Preview da foto cadastrada"
                        className="w-full h-full object-contain"
                      />

                      <canvas
                        ref={previewCanvasRef}
                        className="absolute inset-0 w-full h-full pointer-events-none"
                      />

                      {photoAnalyzing && (
                        <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-10">
                          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-3" />
                          <p className="text-sm font-semibold text-slate-800">
                            Detectando rosto na foto...
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            Localizando landmarks e extraindo vetor biométrico 128D
                          </p>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={handleClearPhoto}
                        className="absolute top-3 right-3 p-2 bg-slate-900/70 hover:bg-slate-900 text-white rounded-full transition backdrop-blur-sm z-20"
                        title="Trocar foto"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Trocar por outra foto
                      </button>
                    </div>
                  </div>
                )}

                {/* Status e Feedback da Foto */}
                <div className="mt-4 w-full">
                  {photoStatus === "error" && (
                    <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block mb-0.5">Validação da Foto:</span>
                        <span>{photoMessage}</span>
                      </div>
                    </div>
                  )}

                  {photoStatus === "valid" && (
                    <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block mb-0.5">Rosto identificado com sucesso!</span>
                        <span>{photoMessage}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-xs w-full">
                  <div
                    className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                      photoStatus === "valid"
                        ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                        : "bg-slate-50 border-slate-200 text-slate-400"
                    }`}
                  >
                    <div
                      className={`w-2 h-2 rounded-full ${
                        photoStatus === "valid" ? "bg-emerald-500" : "bg-slate-300"
                      }`}
                    />
                    <span className="font-medium">Exatamente 1 rosto</span>
                  </div>

                  <div
                    className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                      photoDescriptor
                        ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                        : "bg-slate-50 border-slate-200 text-slate-400"
                    }`}
                  >
                    <div
                      className={`w-2 h-2 rounded-full ${
                        photoDescriptor ? "bg-emerald-500" : "bg-slate-300"
                      }`}
                    />
                    <span className="font-medium">Descriptor 128D gerado</span>
                  </div>
                </div>
              </div>
            ) : (
              /* MODO ALTERNATIVO: WEBCAM AO VIVO */
              <div>
                <p className="text-xs text-slate-500 mb-4">
                  Enquadre o rosto da pessoa. O sistema validará se há exatamente 1 face na câmera.
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
            )}
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
                      mode === "photo"
                        ? photoStatus === "valid"
                          ? "text-emerald-700 font-medium"
                          : "text-slate-400"
                        : cameraState.status === "one_face"
                        ? "text-emerald-700 font-medium"
                        : "text-slate-400"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        (mode === "photo" && photoStatus === "valid") ||
                        (mode === "webcam" && cameraState.status === "one_face")
                          ? "bg-emerald-500"
                          : "bg-slate-300"
                      }`}
                    />
                    {mode === "photo"
                      ? "Exatamente 1 rosto identificado na foto"
                      : "Exatamente 1 rosto na câmera"}
                  </li>
                  <li
                    className={`flex items-center gap-2 ${
                      activeDescriptor !== null
                        ? "text-emerald-700 font-medium"
                        : "text-slate-400"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        activeDescriptor !== null ? "bg-emerald-500" : "bg-slate-300"
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
                    <span>Salvar Cadastro Facial</span>
                  </>
                )}
              </button>

              <div className="text-[11px] text-slate-400 text-center leading-relaxed">
                A foto serve apenas como referência no cadastro para gerar o vetor biométrico. A autenticação futura será feita exclusivamente pela câmera com Liveness.
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserProfileDTO, UserStatementDTO } from "@/lib/services/user-service";
import { LivenessSecurityVerification } from "@/components/LivenessSecurityVerification";
import {
  ScanFace,
  Receipt,
  User as UserIcon,
  LogOut,
  Loader2,
  Calendar,
  ShieldCheck,
  CreditCard,
  Hash,
  Mail,
  BadgeCheck,
  Camera,
  CheckCircle2,
  Lock,
  Unlock,
  AlertCircle,
  CameraOff,
  RefreshCw,
  Sparkles,
  ArrowRight,
  Eye,
  Users,
  Menu,
  X,
} from "lucide-react";

type Tab = "reconhecimento" | "extrato" | "perfil";

export default function DashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("reconhecimento");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [profile, setProfile] = useState<UserProfileDTO | null>(null);
  const [statement, setStatement] = useState<UserStatementDTO | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);

  const handleSelectTab = (tab: Tab) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  };

  // ESTADO DE VALIDAÇÃO DE VIVACIDADE (Passo 2)
  // Só libera os menus de extrato e perfil depois que for validado!
  const [isLivenessValidated, setIsLivenessValidated] = useState<boolean>(false);
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const sessionRes = await fetch("/api/auth/session");
        const sessionData = await sessionRes.json();

        if (!sessionRes.ok || !sessionData.authenticated || !sessionData.user) {
          router.push("/");
          return;
        }

        const user = sessionData.user;
        setProfile(user);
        if (user.faceImage) {
          setCapturedPhotoUrl(user.faceImage);
        }

        // Regra de Negócio:
        // O liveness só é exibido obrigatoriamente para quem NÃO tem rosto cadastrado,
        // ou quando o usuário é sorteado após 3-5 acessos (requiresVerification === true).
        if (!user.requiresVerification) {
          setIsLivenessValidated(true);
        } else {
          setIsLivenessValidated(false);
        }

        // Carregar extrato
        const statementRes = await fetch("/api/user/statement");
        const statementData = await statementRes.json();
        if (statementRes.ok && statementData.statement) {
          setStatement(statementData.statement);
        }
      } catch (err) {
        console.error("Erro ao carregar sessão:", err);
        router.push("/");
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [router]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Ignora erro
    } finally {
      router.push("/");
    }
  };

  const handleLivenessSuccess = async (photoBase64: string) => {
    setCapturedPhotoUrl(photoBase64);
    setIsLivenessValidated(true);
    setProfile((prev) =>
      prev
        ? {
            ...prev,
            hasFaceRegistered: true,
            requiresVerification: false,
            verificationReason: null,
            ...(photoBase64 ? { faceImage: photoBase64 } : {}),
          }
        : prev
    );

    try {
      const res = await fetch("/api/user/face", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ faceImage: photoBase64 }),
      });
      const data = await res.json();
      if (data.user) {
        setProfile((prev) => ({
          ...(prev || data.user),
          ...data.user,
          requiresVerification: false,
        }));
      }
    } catch (e) {
      console.warn("Aviso ao despachar biometria facial para catraca/SISRU:", e);
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return "-";
    try {
      const d = new Date(isoString);
      return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(d);
    } catch {
      return isoString;
    }
  };

  const formatDisplayCpf = (cpf?: string) => {
    if (!cpf) return "-";
    const clean = cpf.replace(/\D/g, "");
    if (clean.length !== 11) return cpf;
    return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9, 11)}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
        <p className="text-xs text-slate-500 font-medium">Carregando painel...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-slate-100/70">
      {/* ============================================================== */}
      {/* 1. BACKDROP & DRAWER MOBILE LATERAL (Acionado pelo Hambúrguer) */}
      {/* ============================================================== */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 md:hidden transition-opacity duration-200"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Drawer Lateral Mobile que desliza da esquerda */}
      <div
        className={`fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-white z-50 p-6 flex flex-col justify-between shadow-2xl transition-transform duration-300 ease-in-out md:hidden ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div>
          {/* Cabeçalho do Drawer com Botão Fechar */}
          <div className="pb-5 mb-5 border-b border-slate-100 flex items-center justify-between">
            <Link
              href="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center shrink-0 shadow-sm">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-slate-900">RecFacial</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    MVP
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">Painel Biométrico</span>
              </div>
            </Link>

            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              aria-label="Fechar menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Menus do Drawer Mobile */}
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-2">
            Navegação
          </div>
          <nav className="space-y-1.5">
            {/* Item 1: Reconhecimento Facial */}
            <button
              type="button"
              onClick={() => handleSelectTab("reconhecimento")}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-semibold transition cursor-pointer ${
                activeTab === "reconhecimento"
                  ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <ScanFace className="w-4 h-4 shrink-0" />
                <span>Reconhecimento</span>
              </div>
              {isLivenessValidated ? (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    activeTab === "reconhecimento"
                      ? "bg-white/20 text-white border border-white/30"
                      : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  }`}
                >
                  ✓ Real
                </span>
              ) : (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    activeTab === "reconhecimento"
                      ? "bg-white/20 text-white border border-white/30"
                      : "bg-amber-50 text-amber-700 border border-amber-200"
                  }`}
                >
                  Obrigatório
                </span>
              )}
            </button>

            {/* Item 2: Extrato */}
            <button
              type="button"
              disabled={!isLivenessValidated}
              onClick={() => handleSelectTab("extrato")}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-semibold transition ${
                !isLivenessValidated
                  ? "opacity-50 text-slate-400 bg-slate-50 cursor-not-allowed border border-dashed border-slate-200"
                  : activeTab === "extrato"
                  ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20 cursor-pointer"
                  : "text-slate-700 hover:bg-slate-100 cursor-pointer"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Receipt className="w-4 h-4 shrink-0" />
                <span>Extrato</span>
              </div>
              {!isLivenessValidated ? (
                <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              ) : (
                <Unlock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              )}
            </button>

            {/* Item 3: Perfil */}
            <button
              type="button"
              disabled={!isLivenessValidated}
              onClick={() => handleSelectTab("perfil")}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-semibold transition ${
                !isLivenessValidated
                  ? "opacity-50 text-slate-400 bg-slate-50 cursor-not-allowed border border-dashed border-slate-200"
                  : activeTab === "perfil"
                  ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20 cursor-pointer"
                  : "text-slate-700 hover:bg-slate-100 cursor-pointer"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <UserIcon className="w-4 h-4 shrink-0" />
                <span>Perfil</span>
              </div>
              {!isLivenessValidated ? (
                <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              ) : (
                <Unlock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              )}
            </button>

            <div className="pt-2 pb-1">
              <div className="border-t border-slate-100" />
            </div>

            <Link
              href="/cadastros"
              onClick={() => setIsMobileMenuOpen(false)}
              className="w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
            >
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4 text-slate-500 shrink-0" />
                <span>Área de Cadastros</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </Link>
          </nav>
        </div>

        {/* Rodapé Mobile Drawer */}
        <div className="pt-4 border-t border-slate-100 mt-6 space-y-3">
          <div className="flex items-center gap-3 px-1">
            {capturedPhotoUrl ? (
              <div className="w-9 h-9 rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-sm shrink-0 bg-slate-900">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={capturedPhotoUrl}
                  alt="Foto do usuário"
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-9 h-9 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                {profile?.name?.charAt(0) || "U"}
              </div>
            )}
            <div className="overflow-hidden">
              <span className="text-xs font-bold text-slate-800 block truncate">
                {profile?.name}
              </span>
              <span className="text-[10px] text-slate-400 font-mono block truncate">
                SIAP: {profile?.siap || profile?.ciap}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition border border-rose-200 cursor-pointer active:scale-95"
          >
            {isLoggingOut ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <LogOut className="w-3.5 h-3.5" />
            )}
            <span>Sair da conta</span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. SIDEBAR LATERAL FIXA NO DESKTOP                             */}
      {/* ============================================================== */}
      <aside className="hidden md:flex md:w-72 bg-white border-r border-slate-200/80 p-6 flex-col justify-between shrink-0 md:sticky md:top-0 md:h-screen z-20">
        <div>
          {/* Logo & Brand Header */}
          <div className="pb-5 mb-5 border-b border-slate-100 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center shrink-0 group-hover:bg-indigo-100 transition shadow-sm">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="overflow-hidden">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-slate-900 tracking-tight">
                    RecFacial
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    MVP
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 block truncate">
                  Painel Biométrico
                </span>
              </div>
            </Link>
          </div>

          {/* Menus da Sidebar Desktop */}
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-2">
            Navegação
          </div>
          <nav className="space-y-1.5">
            {/* Item 1: Reconhecimento Facial */}
            <button
              type="button"
              onClick={() => setActiveTab("reconhecimento")}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-semibold transition cursor-pointer ${
                activeTab === "reconhecimento"
                  ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <ScanFace className="w-4 h-4 shrink-0" />
                <span>Reconhecimento</span>
              </div>
              {isLivenessValidated ? (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    activeTab === "reconhecimento"
                      ? "bg-white/20 text-white border border-white/30"
                      : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  }`}
                >
                  ✓ Real
                </span>
              ) : (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    activeTab === "reconhecimento"
                      ? "bg-white/20 text-white border border-white/30"
                      : "bg-amber-50 text-amber-700 border border-amber-200"
                  }`}
                >
                  Obrigatório
                </span>
              )}
            </button>

            {/* Item 2: Extrato (Bloqueado até validar vivacidade) */}
            <button
              type="button"
              disabled={!isLivenessValidated}
              onClick={() => setActiveTab("extrato")}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-semibold transition ${
                !isLivenessValidated
                  ? "opacity-50 text-slate-400 bg-slate-50 cursor-not-allowed border border-dashed border-slate-200"
                  : activeTab === "extrato"
                  ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20 cursor-pointer"
                  : "text-slate-700 hover:bg-slate-100 cursor-pointer"
              }`}
              title={
                !isLivenessValidated
                  ? "Bloqueado: confirme sua presença com a câmera para desbloquear"
                  : ""
              }
            >
              <div className="flex items-center gap-2.5">
                <Receipt className="w-4 h-4 shrink-0" />
                <span>Extrato</span>
              </div>
              {!isLivenessValidated ? (
                <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              ) : (
                <Unlock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              )}
            </button>

            {/* Item 3: Perfil (Bloqueado até validar vivacidade) */}
            <button
              type="button"
              disabled={!isLivenessValidated}
              onClick={() => setActiveTab("perfil")}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-semibold transition ${
                !isLivenessValidated
                  ? "opacity-50 text-slate-400 bg-slate-50 cursor-not-allowed border border-dashed border-slate-200"
                  : activeTab === "perfil"
                  ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20 cursor-pointer"
                  : "text-slate-700 hover:bg-slate-100 cursor-pointer"
              }`}
              title={
                !isLivenessValidated
                  ? "Bloqueado: confirme sua presença com a câmera para desbloquear"
                  : ""
              }
            >
              <div className="flex items-center gap-2.5">
                <UserIcon className="w-4 h-4 shrink-0" />
                <span>Perfil</span>
              </div>
              {!isLivenessValidated ? (
                <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              ) : (
                <Unlock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              )}
            </button>

            {/* Divisor */}
            <div className="pt-2 pb-1">
              <div className="border-t border-slate-100" />
            </div>

            {/* Link para Cadastros */}
            <Link
              href="/cadastros"
              className="w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
            >
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4 text-slate-500 shrink-0" />
                <span>Área de Cadastros</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </Link>
          </nav>
        </div>

        {/* Rodapé da Sidebar Desktop */}
        <div className="pt-4 border-t border-slate-100 mt-6 space-y-3">
          <div className="flex items-center gap-3 px-1">
            {capturedPhotoUrl ? (
              <div className="w-9 h-9 rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-sm shrink-0 bg-slate-900">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={capturedPhotoUrl}
                  alt="Foto do usuário"
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-9 h-9 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                {profile?.name?.charAt(0) || "U"}
              </div>
            )}
            <div className="overflow-hidden">
              <span className="text-xs font-bold text-slate-800 block truncate">
                {profile?.name}
              </span>
              <span className="text-[10px] text-slate-400 font-mono block truncate">
                SIAP: {profile?.siap || profile?.ciap}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition border border-rose-200 cursor-pointer active:scale-95"
          >
            {isLoggingOut ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <LogOut className="w-3.5 h-3.5" />
            )}
            <span>Sair da conta</span>
          </button>
        </div>
      </aside>

      {/* ============================================================== */}
      {/* 3. ÁREA PRINCIPAL DO DASHBOARD                                 */}
      {/* ============================================================== */}
      <main className="flex-1 flex flex-col min-h-screen overflow-y-auto">
        {/* Top Header do Conteúdo com Botão Hambúrguer Mobile */}
        <header className="h-16 bg-white border-b border-slate-200/80 px-4 sm:px-8 flex items-center justify-between shrink-0 sticky top-0 z-30 shadow-xs">
          <div className="flex items-center gap-3">
            {/* Botão Hambúrguer para abrir Sidebar no Mobile */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition border border-slate-200 cursor-pointer"
              aria-label="Abrir menu de navegação"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div>
              <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                {activeTab === "reconhecimento" && "Reconhecimento Facial & Prova de Vida"}
                {activeTab === "extrato" && "Extrato de Movimentações"}
                {activeTab === "perfil" && "Meu Perfil"}
              </h1>
              <span className="text-[10px] text-slate-400 block sm:hidden">
                {profile?.name}
              </span>
            </div>
          </div>

          <div>
            {isLivenessValidated ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Pessoa Real Confirmada</span>
                <span className="sm:hidden">Confirmado</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                <Eye className="w-3.5 h-3.5 text-amber-600" />
                <span className="hidden sm:inline">Validação Obrigatória</span>
                <span className="sm:hidden">Obrigatório</span>
              </span>
            )}
          </div>
        </header>

        {/* Corpo do Conteúdo */}
        <div className="flex-1 p-2 sm:p-6 md:p-8 max-w-4xl mx-auto w-full flex flex-col justify-center">
          <div className="w-full bg-white border-0 sm:border border-slate-200/90 rounded-2xl sm:rounded-3xl p-1 sm:p-6 md:p-8 shadow-xs sm:shadow-sm">
            {/* ============================================================== */}
            {/* 1. ABA RECONHECIMENTO FACIAL (Câmera + Liveness + Anti-Spoof)  */}
            {/* ============================================================== */}
            {activeTab === "reconhecimento" && (
              <div className="w-full flex flex-col items-center">
                {isLivenessValidated ? (
                  <div className="w-full max-w-xl mx-auto text-center py-4 animate-in zoom-in-95 duration-200 space-y-6">
                    <div className="w-16 h-16 rounded-3xl bg-emerald-50 border border-emerald-300 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>

                    <div>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 mb-2">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                        {profile?.hasFaceRegistered ? "Biometria Ativa & Liberada" : "Verificação concluída"}
                      </span>
                      <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                        {profile?.hasFaceRegistered ? "Acesso à Catraca Liberado" : "Pessoa real confirmada"}
                      </h2>
                      <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto">
                        Sua biometria facial está ativa e sincronizada com o sistema de controle de acesso (SISRU / Catracas). Os menus de <strong className="text-indigo-600">Extrato</strong> e <strong className="text-indigo-600">Perfil</strong> estão totalmente liberados.
                      </p>
                    </div>

                    {/* Exibição da Foto Capturada */}
                    {capturedPhotoUrl && (
                      <div className="p-4 rounded-3xl bg-slate-50 border border-slate-200 max-w-xs mx-auto">
                        <div className="relative w-40 h-48 rounded-2xl overflow-hidden border-2 border-emerald-400 shadow-md mx-auto bg-slate-900">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={capturedPhotoUrl}
                            alt="Foto capturada com Liveness"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute bottom-2 left-2 right-2 bg-slate-900/80 backdrop-blur-sm rounded-lg py-1 px-2 text-[10px] text-emerald-300 font-bold text-center">
                            ✓ Presença Confirmada
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setActiveTab("perfil")}
                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition cursor-pointer"
                      >
                        <UserIcon className="w-4 h-4" />
                        <span>Visualizar meu Perfil</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsLivenessValidated(false)}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-300 transition cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Refazer verificação de presença</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <LivenessSecurityVerification
                    onVerified={handleLivenessSuccess}
                    onCancel={handleLogout}
                    userName={profile?.name}
                    verificationReason={profile?.verificationReason}
                  />
                )}
              </div>
            )}

        {/* ============================================================== */}
        {/* 2. ABA EXTRATO (Liberada após Liveness)                         */}
        {/* ============================================================== */}
        {activeTab === "extrato" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Extrato de Movimentações
                </h2>
                <p className="text-xs text-slate-500">
                  Histórico de compras, créditos e transações da conta.
                </p>
              </div>

              <div className="text-right">
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block">
                  Saldo Atual
                </span>
                <span className="text-base font-extrabold text-slate-900">
                  R$ 0,00
                </span>
              </div>
            </div>

            <div className="py-16 text-center flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
                <Receipt className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-slate-700">
                Nenhuma movimentação encontrada.
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Quando houver registros de créditos, refeições ou compras vinculadas ao seu SIAP, eles aparecerão aqui.
              </p>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* 3. ABA PERFIL (Com a foto capturada em demonstração)           */}
        {/* ============================================================== */}
        {activeTab === "perfil" && (
          <div className="space-y-6">
            <div className="pb-3 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">
                Dados do Perfil
              </h2>
              <p className="text-xs text-slate-500">
                Informações cadastrais e biometria facial capturada (somente leitura).
              </p>
            </div>

            {/* Foto Tirada com Liveness em Destaque */}
            {capturedPhotoUrl ? (
              <div className="flex flex-col sm:flex-row items-center gap-5 p-5 rounded-3xl bg-slate-50 border border-slate-200">
                <div className="relative w-28 h-36 rounded-2xl overflow-hidden border-2 border-emerald-400 shadow-md shrink-0 bg-slate-900">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={capturedPhotoUrl}
                    alt="Foto tirada com Liveness"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-1.5 left-1.5 right-1.5 bg-slate-900/80 backdrop-blur-sm rounded-md py-0.5 text-[9px] text-emerald-300 font-bold text-center">
                    ✓ Validada
                  </div>
                </div>

                <div className="space-y-1.5 text-center sm:text-left">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                    <BadgeCheck className="w-4 h-4 text-emerald-600" />
                    <span>Pessoa Real Confirmada</span>
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    {profile?.name}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed max-w-md">
                    Esta imagem foi capturada durante a verificação de presença (Liveness e Anti-Spoofing). Não é utilizada para identificação por matching facial.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Nenhuma foto biométrica capturada nesta sessão ainda.</span>
              </div>
            )}

            {/* Grade de Dados Somente Leitura */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                  <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                  Nome completo
                </span>
                <span className="text-sm font-semibold text-slate-900 block select-text">
                  {profile?.name}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                  CPF
                </span>
                <span className="text-sm font-semibold text-slate-900 block font-mono select-text">
                  {formatDisplayCpf(profile?.cpf)}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-slate-400" />
                  SIAP
                </span>
                <span className="text-sm font-semibold text-slate-900 block font-mono select-text">
                  {profile?.siap || profile?.ciap}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                  <BadgeCheck className="w-3.5 h-3.5 text-slate-400" />
                  Tipo de usuário
                </span>
                <span className="text-sm font-semibold text-slate-900 block select-text">
                  {profile?.userType}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  E-mail
                </span>
                <span className="text-sm font-semibold text-slate-900 block select-text">
                  {profile?.email}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Data de cadastro
                </span>
                <span className="text-sm font-semibold text-slate-900 block select-text">
                  {formatDate(profile?.createdAt)}
                </span>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 text-center pt-2">
              Conforme as diretrizes de segurança, os dados cadastrais são imutáveis pelo usuário após a confirmação.
            </div>
            </div>
          )}
          </div>
        </div>
      </main>
    </div>
  );
}

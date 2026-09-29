"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StepRegisterFlow } from "@/components/registration/StepRegisterFlow";
import { formatCPF } from "@/lib/validation";
import {
  ArrowRight,
  ShieldCheck,
  UserCheck,
  Lock,
  CreditCard,
  Loader2,
  AlertCircle,
  UserPlus,
  LogIn,
} from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<"initial" | "register" | "login">("initial");
  const [hasSession, setHasSession] = useState<boolean>(false);

  // Estado do formulário de login
  const [loginCpf, setLoginCpf] = useState<string>("");
  const [loginPassword, setLoginPassword] = useState<string>("");
  const [loginLoading, setLoginLoading] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated) {
          setHasSession(true);
        }
      })
      .catch(() => {});
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const cleanCpf = loginCpf.replace(/\D/g, "");
    if (!cleanCpf) {
      setLoginError("Informe o CPF.");
      return;
    }
    if (!loginPassword) {
      setLoginError("Informe a senha.");
      return;
    }

    setLoginLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cpf: cleanCpf,
          password: loginPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "CPF ou senha incorretos.");
      }

      // Redireciona para o dashboard para realizar a verificação de vivacidade
      router.push("/dashboard");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao efetuar login.";
      setLoginError(msg);
    } finally {
      setLoginLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between">
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex items-center justify-center">
        <div className="w-full py-4 max-w-xl mx-auto">
          {viewMode === "initial" && (
            /* TELA INICIAL MINIMALISTA */
            <div className="min-h-[55vh] flex flex-col items-center justify-center text-center px-4 animate-in fade-in duration-300">
              <div className="w-16 h-16 rounded-3xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center mb-6 shadow-sm">
                <ShieldCheck className="w-8 h-8" />
              </div>

              <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                Controle de Acesso Biométrico
              </h1>

              <p className="mt-3 text-base text-slate-600 max-w-sm">
                Cadastre seus dados para começar ou acesse sua conta existente.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row items-center gap-3 w-full max-w-xs">
                <button
                  type="button"
                  onClick={() => setViewMode("register")}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-2xl transition shadow-md shadow-indigo-600/20 cursor-pointer active:scale-95"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Criar conta</span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode("login")}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-2xl transition border border-slate-300 shadow-sm cursor-pointer active:scale-95"
                >
                  <LogIn className="w-4 h-4 text-slate-500" />
                  <span>Fazer login</span>
                </button>
              </div>

              {hasSession && (
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-medium mt-6"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  Você já possui uma sessão ativa. Ir para o Dashboard
                </Link>
              )}
            </div>
          )}

          {viewMode === "register" && (
            /* FLUXO DE CADASTRO SIMPLES */
            <div className="animate-in fade-in slide-in-from-bottom-3 duration-300">
              <div className="mb-4 text-center">
                <button
                  type="button"
                  onClick={() => setViewMode("login")}
                  className="text-xs text-slate-500 hover:text-indigo-600 font-medium transition"
                >
                  Já possui conta? <span className="text-indigo-600 font-bold underline">Entrar com CPF e Senha</span>
                </button>
              </div>
              <StepRegisterFlow />
            </div>
          )}

          {viewMode === "login" && (
            /* FORMULÁRIO DE LOGIN COM CPF E SENHA */
            <div className="animate-in fade-in slide-in-from-bottom-3 duration-300">
              <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
                <div className="text-center mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center mx-auto mb-3 shadow-sm">
                    <LogIn className="w-6 h-6" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                    Acesse sua conta
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Entre com seu CPF e senha para realizar o reconhecimento facial.
                  </p>
                </div>

                {loginError && (
                  <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>{loginError}</span>
                  </div>
                )}

                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      CPF
                    </label>
                    <div className="relative">
                      <CreditCard className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        required
                        maxLength={14}
                        placeholder="000.000.000-00"
                        value={loginCpf}
                        onChange={(e) => setLoginCpf(formatCPF(e.target.value))}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Senha
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="password"
                        required
                        placeholder="Sua senha"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={loginLoading}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-2xl shadow-sm transition disabled:opacity-70 cursor-pointer"
                    >
                      {loginLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-white" />
                          <span>Entrando...</span>
                        </>
                      ) : (
                        <>
                          <span>Entrar</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>

                  <div className="text-center pt-3 border-t border-slate-100 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => setViewMode("register")}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                    >
                      Não tem uma conta? Cadastre-se aqui
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("initial")}
                      className="text-xs text-slate-400 hover:text-slate-600"
                    >
                      Voltar ao início
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <p>
          Sistema de Reconhecimento Facial • Biometria em Tempo Real (SQLite + Prisma + face-api)
        </p>
      </footer>
    </div>
  );
}

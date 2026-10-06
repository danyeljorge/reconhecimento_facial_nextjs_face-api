"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/services/auth.service";
import { formatCPF } from "@/lib/validation";

type HomeViewMode = "initial" | "register" | "login";

export function useHomePage() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<HomeViewMode>("initial");
  const [hasSession, setHasSession] = useState<boolean>(false);
  const [loginCpf, setLoginCpf] = useState<string>("");
  const [loginPassword, setLoginPassword] = useState<string>("");
  const [loginLoading, setLoginLoading] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    authService
      .getSession()
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
      const data = await authService.login({
        cpf: cleanCpf,
        password: loginPassword,
      });

      if (!data.success) {
        throw new Error(data.error || "CPF ou senha incorretos.");
      }

      router.push("/dashboard");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao efetuar login.";
      setLoginError(msg);
    } finally {
      setLoginLoading(false);
    }
  };

  return {
    viewMode,
    setViewMode,
    hasSession,
    loginCpf,
    setLoginCpf,
    loginPassword,
    setLoginPassword,
    loginLoading,
    loginError,
    handleLoginSubmit,
    formatCPF,
  };
}
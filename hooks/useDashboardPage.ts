"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/services/auth.service";
import { userApiService } from "@/services/user-api.service";
import { UserProfileDTO, UserStatementDTO } from "@/lib/services/user-service";

type Tab = "reconhecimento" | "extrato" | "perfil";

export function useDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("reconhecimento");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [profile, setProfile] = useState<UserProfileDTO | null>(null);
  const [statement, setStatement] = useState<UserStatementDTO | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);
  const [isLivenessValidated, setIsLivenessValidated] = useState<boolean>(false);
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(null);

  const handleSelectTab = useCallback((tab: Tab) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  }, []);

  useEffect(() => {
    async function loadData() {
      try {
        const sessionData = await authService.getSession();

        if (!sessionData.authenticated || !sessionData.user) {
          router.push("/");
          return;
        }

        const user = sessionData.user;
        setProfile(user);

        if (user.faceImage) {
          setCapturedPhotoUrl(user.faceImage);
        }

        setIsLivenessValidated(!user.requiresVerification);

        const statementData = await userApiService.getStatement();
        if (statementData.success && statementData.statement) {
          setStatement(statementData.statement);
        }
      } catch (error) {
        console.error("Erro ao carregar sessão:", error);
        router.push("/");
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [router]);

  const handleLogout = useCallback(async () => {
    setIsLoggingOut(true);
    try {
      await authService.logout();
    } finally {
      router.push("/");
    }
  }, [router]);

  const handleLivenessSuccess = useCallback(async (photoBase64: string) => {
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
      const data = await userApiService.updateFaceImage(photoBase64);
      if (data.user) {
        setProfile((prev:any) =>
          prev
            ? {
                ...prev,
                ...data.user,
                requiresVerification: false,
              }
            : {
                ...data.user,
                requiresVerification: false,
              }
        );
      }
    } catch (error) {
      console.warn("Aviso ao despachar biometria facial para catraca/SISRU:", error);
    }
  }, []);

  const resetLivenessValidation = useCallback(() => {
    setIsLivenessValidated(false);
  }, []);

  const formatDate = useCallback((isoString?: string) => {
    if (!isoString) return "-";

    try {
      const date = new Date(isoString);
      return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(date);
    } catch {
      return isoString;
    }
  }, []);

  const formatDisplayCpf = useCallback((cpf?: string) => {
    if (!cpf) return "-";
    const clean = cpf.replace(/\D/g, "");
    if (clean.length !== 11) return cpf;
    return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9, 11)}`;
  }, []);

  return {
    activeTab,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    profile,
    statement,
    isLoading,
    isLoggingOut,
    isLivenessValidated,
    capturedPhotoUrl,
    handleSelectTab,
    handleLogout,
    handleLivenessSuccess,
    resetLivenessValidation,
    formatDate,
    formatDisplayCpf,
  };
}
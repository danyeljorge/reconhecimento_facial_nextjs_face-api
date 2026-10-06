"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { UserType, isValidCPF, isValidEmail } from "@/lib/validation";
import { cadastrosService, CadastroUserSummary } from "@/services/cadastros.service";

export function useCadastrosPage() {
  const [users, setUsers] = useState<CadastroUserSummary[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [deletingUser, setDeletingUser] = useState<CadastroUserSummary | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [newFormData, setNewFormData] = useState({
    name: "",
    cpf: "",
    siap: "",
    userType: "Graduação" as UserType,
    email: "",
    password: "",
  });

  const showToast = useCallback((text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  }, []);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const data = await cadastrosService.list();
      if (!data.success) {
        throw new Error(data.error || "Não foi possível carregar os cadastros.");
      }
      setUsers(data.users || []);
    } catch (error) {
      console.error("Erro ao buscar cadastros:", error);
      const msg = error instanceof Error ? error.message : "Erro ao consultar o banco de dados.";
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleOpenDelete = useCallback((user: CadastroUserSummary) => {
    setDeletingUser(user);
    setDeleteError(null);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!deletingUser) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      const data = await cadastrosService.remove(deletingUser.id);
      if (!data.success) {
        throw new Error(data.error || "Falha ao excluir cadastro.");
      }

      setUsers((prev) => prev.filter((user) => user.id !== deletingUser.id));
      setDeletingUser(null);
      showToast("Cadastro excluído com sucesso!");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Erro ao excluir.";
      setDeleteError(msg);
    } finally {
      setIsDeleting(false);
    }
  }, [deletingUser, showToast]);

  const handleCreateSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setCreateError(null);

      const cleanCpf = newFormData.cpf.replace(/\D/g, "");

      if (!newFormData.name.trim() || newFormData.name.trim().length < 2) {
        setCreateError("O nome completo deve ter pelo menos 2 caracteres.");
        return;
      }
      if (!isValidCPF(cleanCpf)) {
        setCreateError("CPF inválido. Verifique os dígitos.");
        return;
      }
      if (!newFormData.siap.trim() || newFormData.siap.trim().length < 2) {
        setCreateError("O SIAP é obrigatório.");
        return;
      }
      if (!isValidEmail(newFormData.email)) {
        setCreateError("Informe um e-mail válido.");
        return;
      }
      if (!newFormData.password || newFormData.password.length < 6) {
        setCreateError("A senha deve ter no mínimo 6 caracteres.");
        return;
      }

      setIsCreating(true);

      try {
        const data = await cadastrosService.create({
          name: newFormData.name.trim(),
          cpf: cleanCpf,
          siap: newFormData.siap.trim(),
          ciap: newFormData.siap.trim(),
          userType: newFormData.userType,
          email: newFormData.email.trim().toLowerCase(),
          password: newFormData.password,
          confirmPassword: newFormData.password,
        });

        if (!data.success) {
          throw new Error(data.error || "Não foi possível criar o cadastro.");
        }

        setIsCreateModalOpen(false);
        setNewFormData({
          name: "",
          cpf: "",
          siap: "",
          userType: "Graduação",
          email: "",
          password: "",
        });
        showToast("Novo cadastro criado com sucesso!");
        fetchUsers();
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Erro ao criar cadastro.";
        setCreateError(msg);
      } finally {
        setIsCreating(false);
      }
    },
    [fetchUsers, newFormData, showToast]
  );

  const formatDate = useCallback((isoString: string) => {
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

  const formatDisplayCpf = useCallback((cpf: string) => {
    const clean = cpf.replace(/\D/g, "");
    if (clean.length !== 11) return cpf;
    return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9, 11)}`;
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const q = searchTerm.toLowerCase();
      const siapVal = (user.siap || user.ciap || "").toLowerCase();
      return (
        user.name.toLowerCase().includes(q) ||
        user.cpf.toLowerCase().includes(q) ||
        siapVal.includes(q) ||
        user.email.toLowerCase().includes(q)
      );
    });
  }, [searchTerm, users]);

  return {
    users,
    searchTerm,
    setSearchTerm,
    isLoading,
    errorMessage,
    toastMessage,
    deletingUser,
    setDeletingUser,
    isDeleting,
    deleteError,
    isCreateModalOpen,
    setIsCreateModalOpen,
    isCreating,
    createError,
    setCreateError,
    newFormData,
    setNewFormData,
    showToast,
    fetchUsers,
    handleOpenDelete,
    handleConfirmDelete,
    handleCreateSubmit,
    formatDate,
    formatDisplayCpf,
    filteredUsers,
  };
}
"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Modal } from "@/components/Modal";
import {
  Users,
  Search,
  Calendar,
  Trash2,
  AlertTriangle,
  UserPlus,
  Loader2,
  CheckCircle2,
  ArrowLeft,
  RefreshCw,
  CreditCard,
  Hash,
  BadgeCheck,
} from "lucide-react";
import {
  USER_TYPES,
  UserType,
  isValidCPF,
  formatCPF,
  isValidEmail,
} from "@/lib/validation";

interface CadastroUser {
  id: string;
  name: string;
  cpf: string;
  siap: string;
  ciap?: string;
  userType: string;
  email: string;
  faceImage?: string | null;
  hasFaceRegistered?: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function CadastrosPage() {
  const [users, setUsers] = useState<CadastroUser[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  // Modal de Exclusão com confirmação
  const [deletingUser, setDeletingUser] = useState<CadastroUser | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Modal de Novo Cadastro Básico (Sem reconhecimento facial)
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

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/cadastros");
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Não foi possível carregar os cadastros.");
      }
      setUsers(data.users || []);
    } catch (err: unknown) {
      console.error("Erro ao buscar cadastros:", err);
      const msg = err instanceof Error ? err.message : "Erro ao consultar o banco de dados.";
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Exclusão com confirmação
  const handleOpenDelete = (user: CadastroUser) => {
    setDeletingUser(user);
    setDeleteError(null);
  };

  const handleConfirmDelete = async () => {
    if (!deletingUser) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      const res = await fetch(`/api/cadastros/${deletingUser.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Falha ao excluir cadastro.");
      }

      setUsers((prev) => prev.filter((u) => u.id !== deletingUser.id));
      setDeletingUser(null);
      showToast("Cadastro excluído com sucesso!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao excluir.";
      setDeleteError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  // Criação de novo cadastro básico
  const handleCreateSubmit = async (e: React.FormEvent) => {
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
      const res = await fetch("/api/cadastros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newFormData.name.trim(),
          cpf: cleanCpf,
          siap: newFormData.siap.trim(),
          ciap: newFormData.siap.trim(),
          userType: newFormData.userType,
          email: newFormData.email.trim().toLowerCase(),
          password: newFormData.password,
          confirmPassword: newFormData.password,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao criar cadastro.";
      setCreateError(msg);
    } finally {
      setIsCreating(false);
    }
  };

  const formatDate = (isoString: string) => {
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
  };

  const formatDisplayCpf = (cpf: string) => {
    const clean = cpf.replace(/\D/g, "");
    if (clean.length !== 11) return cpf;
    return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9, 11)}`;
  };

  const filteredUsers = users.filter((u) => {
    const q = searchTerm.toLowerCase();
    const siapVal = (u.siap || u.ciap || "").toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.cpf.toLowerCase().includes(q) ||
      siapVal.includes(q) ||
      u.email.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex-1 flex flex-col justify-between">
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-5xl mx-auto pb-16">
      {/* Toast de Notificação */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-lg border text-sm font-semibold animate-in slide-in-from-bottom-5 duration-200 ${
            toastMessage.type === "success"
              ? "bg-white border-emerald-300 text-emerald-800"
              : "bg-white border-rose-300 text-rose-800"
          }`}
        >
          {toastMessage.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 text-xs font-semibold uppercase tracking-wider mb-1">
            <Link href="/" className="hover:underline flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Voltar ao início
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            Gerenciamento de Cadastros
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              {users.length}
            </span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Cadastros básicos do sistema (Nome, CPF e SIAP). Exclusão protegida com confirmação.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchUsers}
            className="p-2.5 text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-100 rounded-xl transition border border-slate-200 shadow-sm"
            title="Atualizar lista"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => {
              setCreateError(null);
              setIsCreateModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            Novo Cadastro
          </button>
        </div>
      </div>

      {/* Barra de Pesquisa */}
      <div className="relative mb-6">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar cadastro por nome, CPF ou SIAP..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-2xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/10 shadow-sm transition"
        />
      </div>

      {/* Conteúdo */}
      {isLoading ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center flex flex-col items-center justify-center shadow-sm">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
          <p className="text-sm font-medium text-slate-600">Consultando cadastros no banco SQL...</p>
        </div>
      ) : errorMessage ? (
        <div className="bg-rose-50 border border-rose-200 rounded-3xl p-6 text-center text-rose-800 shadow-sm">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-rose-600" />
          <p className="text-sm font-semibold">{errorMessage}</p>
          <button
            onClick={fetchUsers}
            className="mt-3 px-4 py-1.5 bg-rose-600 hover:bg-rose-700 rounded-lg text-xs font-medium text-white transition"
          >
            Tentar novamente
          </button>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center flex flex-col items-center shadow-sm">
          <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mb-4">
            <Users className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800 mb-1">
            {searchTerm ? "Nenhum cadastro encontrado para a busca" : "Nenhum cadastro realizado ainda"}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mb-5">
            {searchTerm
              ? "Tente verificar a digitação ou pesquisar por outro termo."
              : "Cadastre pessoas com dados básicos (Nome, CPF e SIAP)."}
          </p>
          {!searchTerm && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow-sm"
            >
              <UserPlus className="w-4 h-4" />
              Criar primeiro cadastro
            </button>
          )}
        </div>
      ) : (
        /* Tabela de Cadastros */
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-[11px] uppercase font-bold text-slate-500 border-b border-slate-200 tracking-wider">
                <tr>
                  <th scope="col" className="px-6 py-4">
                    Nome Completo
                  </th>
                  <th scope="col" className="px-6 py-4">
                    CPF
                  </th>
                  <th scope="col" className="px-6 py-4">
                    SIAP
                  </th>
                  <th scope="col" className="px-6 py-4">
                    Tipo
                  </th>
                  <th scope="col" className="px-6 py-4">
                    Biometria Catraca
                  </th>
                  <th scope="col" className="px-6 py-4">
                    Data
                  </th>
                  <th scope="col" className="px-6 py-4 text-right">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="px-6 py-4 font-semibold text-slate-900 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <span className="block text-sm">{user.name}</span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {user.email}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-slate-600 text-xs font-mono">
                      {formatDisplayCpf(user.cpf)}
                    </td>

                    <td className="px-6 py-4 text-slate-600 text-xs font-mono">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 font-semibold">
                        {user.siap || user.ciap}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-slate-600 text-xs">
                      <span className="inline-flex items-center gap-1 text-slate-700 font-medium">
                        <BadgeCheck className="w-3.5 h-3.5 text-indigo-600" />
                        {user.userType}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-xs">
                      {user.hasFaceRegistered ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Ativa</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <span>Pendente</span>
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-slate-500 text-xs">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formatDate(user.createdAt)}</span>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleOpenDelete(user)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-200 hover:border-rose-600 rounded-xl text-xs font-semibold transition"
                        title="Excluir cadastro com confirmação"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Excluir</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      <Modal
        isOpen={deletingUser !== null}
        onClose={() => setDeletingUser(null)}
        title="Confirmar Exclusão de Cadastro"
      >
        {deletingUser && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-rose-900 text-sm">
                  Deseja realmente excluir este cadastro?
                </p>
                <p className="mt-1 text-rose-700 text-xs leading-relaxed">
                  Esta ação removerá permanentemente o cadastro de{" "}
                  <strong>{deletingUser.name}</strong> (CPF: {formatDisplayCpf(deletingUser.cpf)}, SIAP: {deletingUser.siap || deletingUser.ciap}) do banco de dados.
                </p>
              </div>
            </div>

            {deleteError && (
              <p className="text-xs text-rose-600 flex items-center gap-1 font-medium">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                {deleteError}
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Excluindo...
                  </>
                ) : (
                  "Sim, excluir cadastro"
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal de Criação de Novo Cadastro Básico */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Novo Cadastro Básico"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <p className="text-xs text-slate-500">
            Preencha os dados básicos. O reconhecimento facial com câmera e liveness é realizado separadamente pelo usuário após o login.
          </p>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nome completo <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Carlos Eduardo"
              value={newFormData.name}
              onChange={(e) =>
                setNewFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                CPF <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={14}
                placeholder="000.000.000-00"
                value={newFormData.cpf}
                onChange={(e) =>
                  setNewFormData((prev) => ({
                    ...prev,
                    cpf: formatCPF(e.target.value),
                  }))
                }
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-600 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                SIAP <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Código SIAP"
                value={newFormData.siap}
                onChange={(e) =>
                  setNewFormData((prev) => ({ ...prev, siap: e.target.value }))
                }
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-600 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tipo de usuário <span className="text-rose-500">*</span>
              </label>
              <select
                value={newFormData.userType}
                onChange={(e) =>
                  setNewFormData((prev) => ({
                    ...prev,
                    userType: e.target.value as UserType,
                  }))
                }
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-600"
              >
                {USER_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Senha inicial <span className="text-rose-500">*</span>
              </label>
              <input
                type="password"
                required
                placeholder="Mínimo 6 dígitos"
                value={newFormData.password}
                onChange={(e) =>
                  setNewFormData((prev) => ({
                    ...prev,
                    password: e.target.value,
                  }))
                }
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              E-mail <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              required
              placeholder="exemplo@faculdade.edu.br"
              value={newFormData.email}
              onChange={(e) =>
                setNewFormData((prev) => ({ ...prev, email: e.target.value }))
              }
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-600"
            />
          </div>

          {createError && (
            <p className="text-xs text-rose-600 flex items-center gap-1 font-medium">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              {createError}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              disabled={isCreating}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isCreating}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition disabled:opacity-50"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Criar Cadastro"
              )}
            </button>
          </div>
        </form>
      </Modal>
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

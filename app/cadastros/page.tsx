"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Modal } from "@/components/Modal";
import {
  Users,
  Search,
  Calendar,
  Pencil,
  Trash2,
  AlertTriangle,
  UserPlus,
  Loader2,
  CheckCircle2,
  ArrowLeft,
  RefreshCw,
  ScanFace,
} from "lucide-react";

interface PersonItem {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export default function CadastrosPage() {
  const [persons, setPersons] = useState<PersonItem[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  const [editingPerson, setEditingPerson] = useState<PersonItem | null>(null);
  const [editName, setEditName] = useState<string>("");
  const [isEditingSaving, setIsEditingSaving] = useState<boolean>(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [deletingPerson, setDeletingPerson] = useState<PersonItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const fetchPersons = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/persons");
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Não foi possível carregar a lista de cadastros.");
      }
      setPersons(data.persons || []);
    } catch (err: unknown) {
      console.error("Erro ao buscar pessoas:", err);
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Erro ao conectar com o banco de dados.");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPersons();
  }, [fetchPersons]);

  const handleOpenEdit = (person: PersonItem) => {
    setEditingPerson(person);
    setEditName(person.name);
    setEditError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPerson) return;

    const trimmed = editName.trim();
    if (trimmed.length < 2) {
      setEditError("O nome deve ter pelo menos 2 caracteres.");
      return;
    }
    if (trimmed.length > 150) {
      setEditError("O nome não pode exceder 150 caracteres.");
      return;
    }

    setIsEditingSaving(true);
    setEditError(null);

    try {
      const res = await fetch(`/api/persons/${editingPerson.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Falha ao atualizar nome.");
      }

      setPersons((prev) =>
        prev.map((p) => (p.id === editingPerson.id ? { ...p, name: trimmed } : p))
      );

      setEditingPerson(null);
      showToast("Nome atualizado com sucesso!");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setEditError(err.message);
      } else {
        setEditError("Erro ao salvar alteração.");
      }
    } finally {
      setIsEditingSaving(false);
    }
  };

  const handleOpenDelete = (person: PersonItem) => {
    setDeletingPerson(person);
    setDeleteError(null);
  };

  const handleConfirmDelete = async () => {
    if (!deletingPerson) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      const res = await fetch(`/api/persons/${deletingPerson.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Falha ao excluir cadastro.");
      }

      setPersons((prev) => prev.filter((p) => p.id !== deletingPerson.id));
      setDeletingPerson(null);
      showToast("Cadastro excluído com sucesso!");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setDeleteError(err.message);
      } else {
        setDeleteError("Erro ao excluir do banco de dados.");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    } catch {
      return isoString;
    }
  };

  const filteredPersons = persons.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
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
            Pessoas Cadastradas
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              {persons.length}
            </span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Visualização, edição e exclusão de biometrias faciais registradas no SQLite.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/reconhecer"
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition border border-indigo-200"
          >
            <ScanFace className="w-4 h-4" />
            Reconhecimento
          </Link>
          <button
            onClick={fetchPersons}
            className="p-2 text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-100 rounded-xl transition border border-slate-200 shadow-sm"
            title="Atualizar lista"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <Link
            href="/cadastro"
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            Cadastrar pessoa
          </Link>
        </div>
      </div>

      {/* Barra de Pesquisa */}
      <div className="relative mb-6">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar pessoa por nome completo..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-2xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/10 shadow-sm transition"
        />
      </div>

      {/* Conteúdo */}
      {isLoading ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center flex flex-col items-center justify-center shadow-sm">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
          <p className="text-sm font-medium text-slate-600">Consultando registros no SQLite local...</p>
        </div>
      ) : errorMessage ? (
        <div className="bg-rose-50 border border-rose-200 rounded-3xl p-6 text-center text-rose-800 shadow-sm">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-rose-600" />
          <p className="text-sm font-semibold">{errorMessage}</p>
          <button
            onClick={fetchPersons}
            className="mt-3 px-4 py-1.5 bg-rose-600 hover:bg-rose-700 rounded-lg text-xs font-medium text-white transition"
          >
            Tentar novamente
          </button>
        </div>
      ) : filteredPersons.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center flex flex-col items-center shadow-sm">
          <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mb-4">
            <Users className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800 mb-1">
            {searchTerm ? "Nenhum cadastro encontrado para a busca" : "Nenhuma biometria cadastrada ainda"}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mb-5">
            {searchTerm
              ? "Tente verificar a digitação ou pesquisar por outro nome."
              : "Cadastre a primeira pessoa utilizando a webcam para testar o reconhecimento."}
          </p>
          {!searchTerm && (
            <Link
              href="/cadastro"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow-sm"
            >
              <UserPlus className="w-4 h-4" />
              Cadastrar pessoa agora
            </Link>
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
                    Data do Cadastro
                  </th>
                  <th scope="col" className="px-6 py-4 text-center">
                    Status Biométrico
                  </th>
                  <th scope="col" className="px-6 py-4 text-right">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPersons.map((person) => (
                  <tr
                    key={person.id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="px-6 py-4 font-semibold text-slate-900 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                        {person.name.charAt(0)}
                      </div>
                      <div>
                        <span className="block text-sm">{person.name}</span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          ID: {person.id.substring(0, 10)}...
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-slate-500 text-xs">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formatDate(person.createdAt)}</span>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Face Descriptor 128D
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(person)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                          title="Editar nome"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenDelete(person)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Excluir cadastro"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Edição de Nome */}
      <Modal
        isOpen={editingPerson !== null}
        onClose={() => setEditingPerson(null)}
        title="Editar Nome do Cadastro"
      >
        {editingPerson && (
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <p className="text-xs text-slate-500">
              Você pode alterar o nome da pessoa cadastrada. O vetor biométrico (Face Descriptor) permanece inalterado.
            </p>

            <div>
              <label
                htmlFor="edit-name"
                className="block text-xs font-bold text-slate-700 mb-1.5"
              >
                Nome Completo
              </label>
              <input
                id="edit-name"
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                disabled={isEditingSaving}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
              />
            </div>

            {editError && (
              <p className="text-xs text-rose-600 flex items-center gap-1 font-medium">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                {editError}
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setEditingPerson(null)}
                disabled={isEditingSaving}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isEditingSaving || editName.trim() === ""}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition disabled:opacity-50"
              >
                {isEditingSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar Alterações"
                )}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal de Exclusão */}
      <Modal
        isOpen={deletingPerson !== null}
        onClose={() => setDeletingPerson(null)}
        title="Excluir Cadastro"
      >
        {deletingPerson && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-rose-900 text-sm">
                  Deseja realmente excluir este cadastro?
                </p>
                <p className="mt-1 text-rose-700 text-xs leading-relaxed">
                  Esta ação removerá permanentemente o cadastro de{" "}
                  <strong>{deletingPerson.name}</strong> e todos os seus dados biométricos do banco SQLite.
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
                onClick={() => setDeletingPerson(null)}
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
    </div>
  );
}

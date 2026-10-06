"use client";

import React from "react";
import { USER_TYPES, UserType } from "@/lib/validation";
import { CheckCircle2, AlertCircle, Loader2, ArrowRight } from "lucide-react";
import { useRegisterFlow } from "@/hooks/useRegisterFlow";

export function StepRegisterFlow() {
  const {
    currentStep,
    formData,
    fieldErrors,
    isSubmitting,
    globalError,
    handleFieldChange,
    handleFieldBlur,
    handleSubmit,
    goToDashboard,
  } = useRegisterFlow();

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col items-center">
      <div className="w-full bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
        {currentStep === "dados" && (
          <div>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                Criar sua conta
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Cadastre seus dados para começar.
              </p>
            </div>

            {globalError && (
              <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{globalError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Campo: Nome Completo */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome completo <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Seu nome completo"
                  value={formData.name}
                  onChange={(e) => handleFieldChange("name", e.target.value)}
                  onBlur={() => handleFieldBlur("name")}
                  className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 transition ${
                    fieldErrors.name
                      ? "border-rose-300 focus:ring-rose-500/20"
                      : "border-slate-300 focus:border-indigo-600 focus:ring-indigo-600/10"
                  }`}
                />
                {fieldErrors.name && (
                  <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {fieldErrors.name}
                  </p>
                )}
              </div>

              {/* Grid: CPF e SIAP */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    CPF <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={14}
                    placeholder="000.000.000-00"
                    value={formData.cpf}
                    onChange={(e) => handleFieldChange("cpf", e.target.value)}
                    onBlur={() => handleFieldBlur("cpf")}
                    className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 transition ${
                      fieldErrors.cpf
                        ? "border-rose-300 focus:ring-rose-500/20"
                        : "border-slate-300 focus:border-indigo-600 focus:ring-indigo-600/10"
                    }`}
                  />
                  {fieldErrors.cpf && (
                    <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> {fieldErrors.cpf}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    SIAP <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Código SIAP"
                    value={formData.siap}
                    onChange={(e) => handleFieldChange("siap", e.target.value)}
                    onBlur={() => handleFieldBlur("siap")}
                    className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 transition ${
                      fieldErrors.siap
                        ? "border-rose-300 focus:ring-rose-500/20"
                        : "border-slate-300 focus:border-indigo-600 focus:ring-indigo-600/10"
                    }`}
                  />
                  {fieldErrors.siap && (
                    <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> {fieldErrors.siap}
                    </p>
                  )}
                </div>
              </div>

              {/* Campo: Tipo de Usuário */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tipo de usuário <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.userType}
                  onChange={(e) =>
                    handleFieldChange("userType", e.target.value as UserType)
                  }
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/10 transition"
                >
                  {USER_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                {fieldErrors.userType && (
                  <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {fieldErrors.userType}
                  </p>
                )}
              </div>

              {/* Campo: E-mail */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  E-mail <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  placeholder="exemplo@faculdade.edu.br"
                  value={formData.email}
                  onChange={(e) => handleFieldChange("email", e.target.value)}
                  onBlur={() => handleFieldBlur("email")}
                  className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 transition ${
                    fieldErrors.email
                      ? "border-rose-300 focus:ring-rose-500/20"
                      : "border-slate-300 focus:border-indigo-600 focus:ring-indigo-600/10"
                  }`}
                />
                {fieldErrors.email && (
                  <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {fieldErrors.email}
                  </p>
                )}
              </div>

              {/* Grid: Senha e Confirmação */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Senha <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={formData.password}
                    onChange={(e) => handleFieldChange("password", e.target.value)}
                    onBlur={() => handleFieldBlur("password")}
                    className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 transition ${
                      fieldErrors.password
                        ? "border-rose-300 focus:ring-rose-500/20"
                        : "border-slate-300 focus:border-indigo-600 focus:ring-indigo-600/10"
                    }`}
                  />
                  {fieldErrors.password && (
                    <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> {fieldErrors.password}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Confirmar senha <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    placeholder="Repita sua senha"
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      handleFieldChange("confirmPassword", e.target.value)
                    }
                    onBlur={() => handleFieldBlur("confirmPassword")}
                    className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 transition ${
                      fieldErrors.confirmPassword
                        ? "border-rose-300 focus:ring-rose-500/20"
                        : "border-slate-300 focus:border-indigo-600 focus:ring-indigo-600/10"
                    }`}
                  />
                  {fieldErrors.confirmPassword && (
                    <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> {fieldErrors.confirmPassword}
                    </p>
                  )}
                </div>
              </div>

              {/* Botão Concluir Cadastro */}
              <div className="pt-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-2xl shadow-sm transition disabled:opacity-70 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Cadastrando...</span>
                    </>
                  ) : (
                    <>
                      <span>Criar conta</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {currentStep === "conclusao" && (
          <div className="text-center py-6 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-200 shadow-sm">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">
              Cadastro concluído
            </h2>

            <p className="text-sm text-slate-600 mb-6">
              Seu cadastro foi realizado com sucesso.
            </p>

            <div className="inline-flex items-center gap-2 text-xs text-indigo-700 font-medium bg-indigo-50 px-4 py-2 rounded-full border border-indigo-200 mb-6">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
              <span>Sessão criada automaticamente. Entrando no dashboard...</span>
            </div>

            <div>
              <button
                type="button"
                onClick={goToDashboard}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm transition"
              >
                <span>Acessar Dashboard agora</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 flex items-center justify-center gap-3 text-xs font-medium text-slate-500">
        <div className="flex items-center gap-1.5">
          {currentStep === "dados" ? (
            <span className="text-indigo-600 font-bold">● Dados</span>
          ) : (
            <span className="text-emerald-600 font-semibold flex items-center gap-0.5">
              ✓ Dados
            </span>
          )}
        </div>

        <span className="text-slate-300">─────</span>

        <div className="flex items-center gap-1.5">
          {currentStep === "conclusao" ? (
            <span className="text-emerald-600 font-bold flex items-center gap-0.5">
              ✓ Conclusão
            </span>
          ) : (
            <span className="text-slate-400">○ Conclusão</span>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import React from "react";
import Link from "next/link";
import {
  UserPlus,
  Users,
  ScanFace,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-16 pt-4">
      {/* Hero Principal em Tema Claro */}
      <section className="relative overflow-hidden rounded-3xl bg-white border border-slate-200 p-8 sm:p-12 shadow-sm">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold uppercase tracking-wider mb-5">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            Controle de Acesso Biométrico
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            Sistema de Reconhecimento Facial
          </h1>

          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
            Plataforma biométrica de alta precisão com cadastro facial por foto e autorização de acesso via câmera com Liveness (Anti-Spoofing) e SQLite.
          </p>

          {/* Botões de Ação Imediata */}
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/reconhecer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-2xl transition shadow-md shadow-indigo-600/20 group"
            >
              <ScanFace className="w-5 h-5" />
              <span>Acesso via Câmera</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              href="/cadastro"
              className="inline-flex items-center justify-center gap-2 px-5 py-3.5 bg-white hover:bg-slate-50 text-slate-800 text-sm font-semibold rounded-2xl transition border border-slate-300 shadow-sm"
            >
              <UserPlus className="w-4 h-4 text-slate-600" />
              <span>Cadastrar por Foto</span>
            </Link>

            <Link
              href="/cadastros"
              className="inline-flex items-center justify-center gap-2 px-5 py-3.5 bg-white hover:bg-slate-50 text-slate-800 text-sm font-semibold rounded-2xl transition border border-slate-300 shadow-sm"
            >
              <Users className="w-4 h-4 text-slate-600" />
              <span>Ver Cadastros</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Grid de Módulos Operacionais */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Módulo 1: Reconhecimento Facial */}
        <div className="bg-white border-2 border-indigo-200 rounded-3xl p-7 shadow-sm hover:shadow-md transition flex flex-col justify-between group">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-5 border border-indigo-200">
              <ScanFace className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-2">
              Controle de Acesso
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed mb-6">
              Acesso exclusivo por câmera com camada de Liveness (Anti-Spoofing) antes da validação da pessoa no banco.
            </p>
          </div>
          <Link
            href="/reconhecer"
            className="inline-flex items-center justify-center gap-2 w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition shadow-sm"
          >
            <span>Iniciar Acesso</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Módulo 2: Cadastro Biométrico */}
        <div className="bg-white border border-slate-200 rounded-3xl p-7 shadow-sm hover:shadow-md transition flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-5 border border-emerald-200">
              <UserPlus className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-2">
              Cadastrar Pessoa
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed mb-6">
              Cadastro da pessoa via foto enviada, gerando a referência biométrica (Face Descriptor 128D) para o SQLite.
            </p>
          </div>
          <Link
            href="/cadastro"
            className="inline-flex items-center justify-center gap-2 w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition shadow-sm"
          >
            <span>Cadastrar com Foto</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Módulo 3: Base de Dados */}
        <div className="bg-white border border-slate-200 rounded-3xl p-7 shadow-sm hover:shadow-md transition flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center mb-5 border border-slate-200">
              <Users className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-2">
              Gerenciar Cadastros
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed mb-6">
              Consulte a listagem completa, pesquise por nome, edite cadastros ou exclua registros com segurança.
            </p>
          </div>
          <Link
            href="/cadastros"
            className="inline-flex items-center justify-center gap-2 w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition border border-slate-200"
          >
            <span>Ver Lista</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </section>
    </div>
  );
}

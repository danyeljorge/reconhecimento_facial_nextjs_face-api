"use client";

import React from "react";
import Link from "next/link";
import { StepRegisterFlow } from "@/components/registration/StepRegisterFlow";
import { ArrowLeft } from "lucide-react";

export default function CadastroPage() {
  return (
    <div className="w-full py-4">
      <div className="max-w-xl mx-auto mb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Voltar ao início
        </Link>
      </div>

      <StepRegisterFlow />
    </div>
  );
}

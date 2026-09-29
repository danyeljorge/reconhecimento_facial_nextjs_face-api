import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center text-center px-4">
      <h2 className="text-3xl font-bold text-slate-900 mb-2">404</h2>
      <p className="text-sm text-slate-500 mb-6">Página não encontrada.</p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Voltar ao início
      </Link>
    </div>
  );
}

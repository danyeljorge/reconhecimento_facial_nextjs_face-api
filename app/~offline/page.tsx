import { WifiOff, RefreshCw } from "lucide-react";
import Link from "next/link";

export default function OfflinePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl mb-4 border border-amber-200">
        <WifiOff className="w-10 h-10" />
      </div>
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Você está sem internet</h1>
      <p className="text-slate-600 max-w-md mb-6 text-sm">
        O sistema de biometria facial está operando em modo offline. As páginas e modelos armazenados em cache continuam acessíveis, mas a sincronização com o banco de dados requer conexão.
      </p>
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition shadow-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Tentar Reconectar
        </Link>
      </div>
    </div>
  );
}

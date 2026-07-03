"use client";

import { useRouter } from "next/navigation";

export default function BotonImprimir() {
  const router = useRouter();
  return (
    <div className="mb-6 flex gap-3 print:hidden">
      <button
        onClick={() => window.print()}
        className="rounded-full px-6 py-2.5 font-semibold text-[#151E29] transition hover:brightness-95"
        style={{ background: "var(--accent)" }}
      >
        🖨 Imprimir / guardar como PDF
      </button>
      <button
        onClick={() => router.back()}
        className="rounded-full border px-6 py-2.5 font-semibold transition hover:bg-black/5"
        style={{ borderColor: "var(--border-light-strong)" }}
      >
        ← Volver
      </button>
    </div>
  );
}

"use client";

import { useState } from "react";

// Textarea que bloquea pegar y arrastrar texto: el estudiante debe escribir
// con sus propias palabras (medida anti copia/plagio). El mensaje es amable
// y formativo, siguiendo la política de lenguaje sensible.
type Props = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export default function TextareaSinPegar(props: Props) {
  const [aviso, setAviso] = useState(false);

  function bloquear(e: React.SyntheticEvent) {
    e.preventDefault();
    setAviso(true);
    window.setTimeout(() => setAviso(false), 4000);
  }

  return (
    <>
      <textarea
        {...props}
        onPaste={bloquear}
        onDrop={bloquear}
        spellCheck
      />
      {aviso && (
        <p
          className="mt-1 rounded-lg px-3 py-1.5 text-xs font-semibold"
          style={{ background: "var(--color-warning-bg)", color: "#b45309", border: "1px solid var(--color-warning-border)" }}
        >
          ✍️ Aquí no se puede pegar texto: cuéntalo con tus propias palabras, ¡tú puedes!
        </p>
      )}
    </>
  );
}

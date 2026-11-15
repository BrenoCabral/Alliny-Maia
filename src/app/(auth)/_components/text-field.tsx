type TextFieldProps = {
  name: string;
  label: string;
  type: "email" | "password";
  autoComplete: "email" | "current-password" | "new-password";
  required?: boolean;
  minLength?: number;
  /** Mensagem de erro do campo, vinda do servidor. */
  error?: string;
};

// Campo de texto das telas de acesso: rótulo ligado ao campo e erro ligado
// por aria-describedby.
export function TextField({
  name,
  label,
  type,
  autoComplete,
  required = false,
  minLength,
  error,
}: TextFieldProps) {
  const id = `campo-${name}`;
  const errorId = `${id}-erro`;

  return (
    <div>
      <label
        htmlFor={id}
        className="block text-[11px] font-medium tracking-[0.26em] text-brand-muted uppercase"
      >
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        required={required}
        minLength={minLength}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className="mt-2 block w-full border border-brand-green/30 bg-transparent px-4 py-3 text-[15px] text-brand-ink focus-visible:border-brand-green focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green"
      />
      {error ? (
        <p id={errorId} className="mt-2 text-[13px] text-brand-ink">
          {error}
        </p>
      ) : null}
    </div>
  );
}

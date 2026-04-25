"use client";

import type { ChangeEventHandler } from "react";
import { useId, useState } from "react";

type PasswordFieldProps = {
  ariaDescribedBy?: string | undefined;
  autoComplete?: string | undefined;
  id?: string | undefined;
  name: string;
  onChange?: ChangeEventHandler<HTMLInputElement> | undefined;
  placeholder?: string | undefined;
  required?: boolean | undefined;
  value?: string | undefined;
};

export function PasswordField({
  ariaDescribedBy,
  autoComplete,
  id,
  name,
  onChange,
  placeholder,
  required,
  value,
}: PasswordFieldProps) {
  const generatedId = useId();
  const [isVisible, setIsVisible] = useState(false);
  const buttonLabel = isVisible ? "Hide password" : "Show password";
  const inputId = id ?? generatedId;

  return (
    <div className="password-field-control">
      <input
        aria-describedby={ariaDescribedBy}
        autoComplete={autoComplete}
        id={inputId}
        name={name}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        type={isVisible ? "text" : "password"}
        value={value}
      />
      <button
        aria-label={buttonLabel}
        aria-pressed={isVisible}
        className="password-toggle-button"
        onClick={() => setIsVisible((current) => !current)}
        type="button"
      >
        {isVisible ? "Hide" : "Show"}
      </button>
    </div>
  );
}

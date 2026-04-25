"use client";

import { useId, useState } from "react";
import { PasswordField } from "./password-field";

type DemoCredential = {
  handle: string;
  password: string;
};

type SignInFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  authErrorId?: string | undefined;
  demoCredentials: DemoCredential[];
  redirectTo: string;
};

export function SignInForm({ action, authErrorId, demoCredentials, redirectTo }: SignInFormProps) {
  const handleId = useId();
  const passwordId = useId();
  const [handle, setHandle] = useState("");
  const [password, setPassword] = useState("");
  const canSubmit = handle.trim().length > 0 && password.trim().length > 0;

  return (
    <form action={action} className="stack-form landing-auth-form">
      <input name="redirectTo" type="hidden" value={redirectTo} />
      <div className="field">
        <label htmlFor={handleId}>Handle</label>
        <input
          aria-describedby={authErrorId}
          autoComplete="username"
          id={handleId}
          name="handle"
          onChange={(event) => setHandle(event.currentTarget.value)}
          placeholder="Your handle"
          required
          type="text"
          value={handle}
        />
      </div>
      <div className="field">
        <label htmlFor={passwordId}>Password</label>
        <PasswordField
          ariaDescribedBy={authErrorId}
          autoComplete="current-password"
          id={passwordId}
          name="password"
          onChange={(event) => setPassword(event.currentTarget.value)}
          placeholder="Your password"
          required
          value={password}
        />
      </div>
      <button className="primary-button wide-button landing-submit" disabled={!canSubmit} type="submit">
        Sign in
      </button>
      <div className="landing-demo-note">
        <p className="landing-demo-title">Demo access for this environment</p>
        <div className="landing-demo-list">
          {demoCredentials.map((credential) => (
            <button
              className="landing-demo-chip"
              key={credential.handle}
              onClick={() => {
                setHandle(credential.handle);
                setPassword(credential.password);
              }}
              type="button"
            >
              Use @{credential.handle} demo account
              <span>{credential.password}</span>
            </button>
          ))}
        </div>
      </div>
    </form>
  );
}

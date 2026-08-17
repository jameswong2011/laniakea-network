"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, signup, type AuthFormState } from "@/lib/auth/actions";

type AuthFormProps = {
  mode: "login" | "signup";
};

const initialState: AuthFormState = {};

function Field({
  id,
  label,
  type = "text",
  autoComplete,
  required = true,
}: {
  id: string;
  label: string;
  type?: string;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={id}
        className="font-data text-[10px] tracking-[0.14em] text-muted-foreground uppercase"
      >
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        autoComplete={autoComplete}
        required={required}
        className="h-8 w-full border border-border bg-panel-elevated px-2.5 text-[13px] text-foreground outline-none placeholder:text-muted-foreground/70 focus-visible:border-ring"
      />
    </div>
  );
}

export function AuthForm({ mode }: AuthFormProps) {
  const action = mode === "login" ? login : signup;
  const [state, formAction, pending] = useActionState(action, initialState);
  const isSignup = mode === "signup";

  return (
    <form action={formAction} className="flex flex-col gap-3">
      {isSignup ? (
        <>
          <Field id="username" label="Username" autoComplete="username" />
          <Field id="displayName" label="Display Name" autoComplete="name" />
        </>
      ) : null}
      <Field
        id="email"
        label="Email"
        type="email"
        autoComplete="email"
      />
      <Field
        id="password"
        label="Password"
        type="password"
        autoComplete={isSignup ? "new-password" : "current-password"}
      />

      {state.error ? (
        <p className="font-data text-[11px] text-loss">{state.error}</p>
      ) : null}
      {state.message ? (
        <p className="font-data text-[11px] text-gain">{state.message}</p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 h-8 border border-border bg-secondary text-[12px] font-medium tracking-wide text-foreground hover:bg-muted disabled:opacity-50"
      >
        {pending ? "Submitting…" : isSignup ? "Create account" : "Sign in"}
      </button>

      <p className="font-data text-[11px] text-muted-foreground">
        {isSignup ? (
          <>
            Already registered?{" "}
            <Link href="/login" className="text-foreground hover:underline">
              Sign in
            </Link>
          </>
        ) : (
          <>
            Need an account?{" "}
            <Link href="/signup" className="text-foreground hover:underline">
              Sign up
            </Link>
          </>
        )}
      </p>
    </form>
  );
}

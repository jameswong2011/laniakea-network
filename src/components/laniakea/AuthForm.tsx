"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { login, signup, type AuthFormState } from "@/lib/auth/actions";
import { generateDisplayName } from "@/lib/auth/profile-name";

type AuthFormProps = {
  mode: "login" | "signup";
  inviteCode?: string;
  initialDisplayName?: string;
};

const initialState: AuthFormState = {};

const inputClassName =
  "h-8 w-full border border-border bg-panel-elevated px-2.5 text-[13px] text-foreground outline-none placeholder:text-muted-foreground/70 focus-visible:border-ring";

function Field({
  id,
  label,
  type = "text",
  autoComplete,
  required = true,
  hint,
  pattern,
  title,
  placeholder,
}: {
  id: string;
  label: string;
  type?: string;
  autoComplete?: string;
  required?: boolean;
  hint?: string;
  pattern?: string;
  title?: string;
  placeholder?: string;
}) {
  const hintId = hint ? `${id}-hint` : undefined;

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
        pattern={pattern}
        title={title}
        placeholder={placeholder}
        aria-describedby={hintId}
        className={inputClassName}
      />
      {hint ? (
        <p id={hintId} className="font-data text-[10px] text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function SignupNameFields({ initialDisplayName }: { initialDisplayName?: string }) {
  const [displayName, setDisplayName] = useState(initialDisplayName ?? "");

  return (
    <>
      <Field
        id="username"
        label="Username"
        autoComplete="username"
        placeholder="vale_hart"
        pattern="[A-Za-z0-9_]+"
        title="Username cannot contain spaces. Use letters, numbers, and underscores only."
        hint="Login handle. Letters, numbers, and underscores only."
      />
      <div className="flex flex-col gap-1">
        <label
          htmlFor="displayName"
          className="font-data text-[10px] tracking-[0.14em] text-muted-foreground uppercase"
        >
          Display name
        </label>
        <div className="flex gap-1.5">
          <input
            id="displayName"
            name="displayName"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            autoComplete="nickname"
            required
            placeholder="Quiet Desk 4821"
            aria-describedby="displayName-hint"
            className={inputClassName}
          />
          <button
            type="button"
            onClick={() => setDisplayName(generateDisplayName())}
            className="h-8 shrink-0 border border-border bg-secondary px-2.5 text-[12px] text-foreground hover:bg-muted"
          >
            Reroll
          </button>
        </div>
        <p id="displayName-hint" className="font-data text-[10px] text-muted-foreground">
          Shown on the forum. Reroll or type your own.
        </p>
      </div>
    </>
  );
}

export function AuthForm({
  mode,
  inviteCode = "",
  initialDisplayName,
}: AuthFormProps) {
  const action = mode === "login" ? login : signup;
  const [state, formAction, pending] = useActionState(action, initialState);
  const isSignup = mode === "signup";

  return (
    <form action={formAction} className="flex flex-col gap-3">
      {isSignup ? (
        <SignupNameFields initialDisplayName={initialDisplayName} />
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
      {isSignup ? (
        <div className="flex flex-col gap-1">
          <label
            htmlFor="inviteCode"
            className="font-data text-[10px] tracking-[0.14em] text-muted-foreground uppercase"
          >
            Invite code
          </label>
          <input
            id="inviteCode"
            name="inviteCode"
            defaultValue={inviteCode}
            placeholder="LANI-XXXX-XXXX"
            autoComplete="off"
            className={`${inputClassName} font-data`}
          />
          <p className="font-data text-[10px] text-muted-foreground">
            Optional. Public signup starts Bronze. A valid code starts you on
            the inviter’s desk.
          </p>
        </div>
      ) : null}

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

"use client";

import { useState } from "react";

export function AskNote({
  postId,
  locked,
  onFocusChange,
  onAnswer,
}: {
  postId: string;
  locked?: boolean;
  onFocusChange?: (focused: boolean) => void;
  onAnswer?: (reply: { text: string; section: string | null } | null) => void;
}) {
  const [question, setQuestion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function ask() {
    setPending(true);
    setError(null);
    const response = await fetch("/api/ai/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId, question }),
    });
    const payload = (await response.json().catch(() => null)) as
      | { answer?: string; section?: string; error?: string }
      | null;
    setPending(false);

    if (!response.ok || !payload?.answer) {
      onAnswer?.(null);
      setError(payload?.error ?? "No answer came back.");
      return;
    }

    setError(null);
    onAnswer?.({ text: payload.answer, section: payload.section ?? null });
  }

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        void ask();
      }}
    >
      <label className="flex flex-col gap-1">
        <span className="font-data text-[10px] tracking-[0.14em] text-foreground uppercase">
          {locked ? "Ask the card" : "Ask"}
        </span>
        <input
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          onFocus={() => onFocusChange?.(true)}
          onBlur={() => onFocusChange?.(false)}
          placeholder="What are you curious about"
          className="h-11 rounded-lg border border-foreground/30 bg-panel px-3 text-[16px] text-foreground outline-none focus-visible:border-foreground"
        />
      </label>
      <button
        type="submit"
        disabled={pending || question.trim().length < 2}
        className="h-9 w-fit rounded-md bg-secondary px-3 text-[13px] font-medium text-foreground hover:bg-muted disabled:opacity-50"
      >
        {pending ? "Reading…" : "Ask"}
      </button>
      {error ? <p className="text-[13px] text-loss">{error}</p> : null}
    </form>
  );
}

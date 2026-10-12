"use client";

import { useState } from "react";

export function AskNote({ postId, locked }: { postId: string; locked?: boolean }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [section, setSection] = useState<string | null>(null);
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
      setAnswer(null);
      setSection(null);
      setError(payload?.error ?? "No answer came back.");
      return;
    }

    setAnswer(payload.answer);
    setSection(payload.section ?? null);
  }

  return (
    <form
      className="mb-4 flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        void ask();
      }}
    >
      <label className="flex flex-col gap-1">
        <span className="text-[13px] text-muted-foreground">
          {locked ? "Ask the card" : "Ask this note"}
        </span>
        <input
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="What is the claim, and what would falsify it?"
          className="h-10 rounded-lg border border-border bg-background px-3 text-[14px] text-foreground outline-none focus-visible:border-ring"
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
      {answer ? (
        <p className="text-[14px] leading-relaxed text-foreground">
          {section ? <span className="text-muted-foreground">{section}. </span> : null}
          {answer}
        </p>
      ) : null}
    </form>
  );
}

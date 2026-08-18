import {
  REFERRAL_STEPS,
  WORKED_INVITE_REFERRAL,
  WORKED_UNLOCK_REFERRAL,
} from "@/lib/landing";

function ReferralWorked({
  label,
  note,
  quote,
}: {
  label: string;
  note: string;
  quote: typeof WORKED_INVITE_REFERRAL;
}) {
  const rows = [
    ...(quote.creatorShare > 0
      ? [{ label: "Poster", amount: quote.creatorShare }]
      : []),
    { label: "Platform", amount: quote.platformBurn },
    ...quote.keeps.map((keep) => ({ label: keep.desk, amount: keep.amount })),
    { label: "Dust", amount: quote.dust },
  ];

  return (
    <div className="rounded-xl bg-surface p-4 shadow-border md:p-6">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <p className="section-kicker">{label}</p>
        <p className="font-mono text-xs text-subtle tabular-nums">
          {quote.gross} UTL
        </p>
      </div>
      <p className="text-sm leading-relaxed text-muted">{note}</p>
      <dl className="mt-5">
        {rows.map((row, i) => (
          <div
            key={row.label}
            className={
              i === 0
                ? "flex items-baseline justify-between gap-6 py-2"
                : "flex items-baseline justify-between gap-6 border-t border-border py-2"
            }
          >
            <dt className="text-sm text-muted">{row.label}</dt>
            <dd className="font-mono text-sm text-fg tabular-nums">
              {row.amount} UTL
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function Referral() {
  return (
    <section id="chain" className="border-t border-border">
      <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
        <p className="section-kicker">05 — The chain</p>
        <h2 className="mt-4 max-w-2xl font-display text-2xl leading-title text-fg">
          Invite someone. Their spend pays the line above them.
        </h2>
        <p className="mt-5 max-w-2xl text-muted">
          Referral earnings are UTL, not HP. Every token that leaves a desk
          splits the same way: creator first when there is one, then a halved
          walk up the invite line. The books on Account show what reached you.
        </p>

        <ul className="mt-12 divide-y divide-border border-y border-border">
          {REFERRAL_STEPS.map((step, index) => (
            <li
              key={step.title}
              className="grid gap-3 py-6 md:grid-cols-12 md:items-baseline"
            >
              <span className="font-mono text-xs text-subtle tabular-nums md:col-span-2">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="text-lg text-fg md:col-span-3">{step.title}</h3>
              <p className="text-sm leading-relaxed text-muted md:col-span-7">
                {step.body}
              </p>
            </li>
          ))}
        </ul>

        <div className="mt-16 grid gap-6 md:grid-cols-2">
          <ReferralWorked
            label="Worked buy"
            note="D buys a code. D invited by C, C by B, B by A. No creator."
            quote={WORKED_INVITE_REFERRAL}
          />
          <ReferralWorked
            label="Worked unlock"
            note="Same line. D unlocks a note for 100 UTL. The poster takes 75 first."
            quote={WORKED_UNLOCK_REFERRAL}
          />
        </div>
      </div>
    </section>
  );
}

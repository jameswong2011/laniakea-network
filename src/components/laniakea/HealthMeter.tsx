import {
  getPostHealthLabel,
  getPostHealthPercent,
  getPostHealthState,
  isAscendedStatus,
  type PostHealthState,
} from "@/lib/research/health";
import { formatHp } from "@/lib/format";

function healthTone(state: PostHealthState) {
  if (state === "dying") {
    return {
      value: "text-loss",
      bar: "bg-loss",
      label: "text-loss",
    };
  }

  if (state === "at_risk") {
    return {
      value: "text-warning",
      bar: "bg-warning",
      label: "text-warning",
    };
  }

  return {
    value: "text-gain",
    bar: "bg-gain",
    label: "text-gain",
  };
}

export function HealthMeter({
  currentHealth,
  originalStake,
  status,
}: {
  currentHealth: number;
  originalStake?: number;
  status?: string;
}) {
  const ascended = isAscendedStatus(status);
  const state = getPostHealthState(currentHealth, originalStake);
  const percent = ascended
    ? 100
    : getPostHealthPercent(currentHealth, originalStake);
  const tone = ascended
    ? { value: "text-gain", bar: "bg-gain", label: "text-gain" }
    : healthTone(state);

  return (
    <div className="flex w-[6.75rem] shrink-0 flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-data text-[9px] tracking-[0.14em] text-muted-foreground uppercase">
          HLT
        </span>
        <span className={`font-data text-[12px] leading-none ${tone.value}`}>
          {formatHp(currentHealth)}
        </span>
      </div>
      <div className="h-[3px] overflow-hidden bg-border">
        <div
          className={`h-full ${tone.bar}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span
        className={`font-data text-[9px] tracking-[0.14em] uppercase ${tone.label}`}
      >
        {ascended ? "Ascended" : getPostHealthLabel(state)}
      </span>
    </div>
  );
}

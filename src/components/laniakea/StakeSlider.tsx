export function StakeSlider({
  value,
  max,
  min = 1,
  label = "Stake HP",
  name = "stakeHp",
  suffix = " HP",
  disabled,
  onChange,
}: {
  value: number;
  max: number;
  min?: number;
  label?: string;
  name?: string;
  suffix?: string;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  const floor = Math.min(min, max);
  const ceiling = Math.max(floor, max);
  const shown = Math.min(ceiling, Math.max(floor, value));

  return (
    <div className={`flex flex-col gap-1 ${disabled ? "opacity-40" : ""}`}>
      <div className="flex items-baseline justify-between">
        <span className="text-[13px] text-muted-foreground">{label}</span>
        <span className="text-[15px] font-medium text-foreground">
          {shown}
          {suffix}
        </span>
      </div>
      <input type="hidden" name={name} value={shown} />
      <input
        type="range"
        min={floor}
        max={ceiling}
        step={1}
        value={shown}
        disabled={disabled}
        aria-label={label}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-1 w-full cursor-pointer accent-foreground disabled:cursor-default"
      />
      <div className="flex justify-between text-[11px] text-muted-foreground">
        <span>
          {floor}
          {suffix}
        </span>
        <span>
          {ceiling}
          {suffix}
        </span>
      </div>
    </div>
  );
}

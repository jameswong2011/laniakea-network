export function formatHp(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatSignedHp(value: number) {
  const formatted = formatHp(Math.abs(value));

  if (value > 0) {
    return `+${formatted}`;
  }

  if (value < 0) {
    return `-${formatted}`;
  }

  return formatted;
}

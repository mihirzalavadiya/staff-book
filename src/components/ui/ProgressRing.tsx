interface ProgressRingProps {
  value: number;
  max: number;
  size?: number;
  stroke?: number;
  label?: string;
}

export function ProgressRing({ value, max, size = 66, stroke = 8, label }: ProgressRingProps) {
  const r = size / 2 - stroke / 2 - 2;
  const c = 2 * Math.PI * r;
  const pct = max === 0 ? 0 : Math.min(1, value / max);
  return (
    <div className="relative flex-none" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" className="stroke-glass-2" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          className="stroke-coral"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${c * pct} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center font-display text-lg font-extrabold">
        {label ?? `${value}/${max}`}
      </div>
    </div>
  );
}

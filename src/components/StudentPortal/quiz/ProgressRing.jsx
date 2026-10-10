import React from 'react';

/** Circular progress with the percentage in the middle. */
export default function ProgressRing({ percent = 0, size = 64, stroke = 6, label, tone = 'saffron', children }) {
  const p = Math.max(0, Math.min(100, Math.round(percent)));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const color = tone === 'emerald' ? '#059669' : tone === 'gold' ? '#C08B34' : '#C86314';
  return (
    <div
      className="relative inline-flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={p}
      aria-label={label || `${p}%`}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EEDDB9" strokeWidth={stroke} opacity="0.6" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (p / 100) * c}
          style={{ transition: 'stroke-dashoffset 400ms ease' }}
        />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        {children || <span className="text-sm font-bold text-temple-900">{p}%</span>}
      </span>
    </div>
  );
}

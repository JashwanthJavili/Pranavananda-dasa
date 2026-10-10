import React from 'react';

// Stars and sparkles that burst out from the score ring once, then a soft twinkle.
// Pure CSS, no library. Skipped for people who prefer reduced motion.
const COLORS = ['#E8A23A', '#C86314', '#F2C14E', '#059669', '#E57373', '#C08B34'];
const SHAPES = ['★', '✦', '★', '✧', '●'];
const PIECES = Array.from({ length: 22 }, (_, i) => {
  const angle = (i / 22) * Math.PI * 2 + (i % 2 ? 0.12 : -0.08);
  const dist = 95 + ((i * 37) % 70); // 95–165px, varied but stable
  return {
    dx: Math.round(Math.cos(angle) * dist),
    dy: Math.round(Math.sin(angle) * dist * 0.8),
    size: 10 + ((i * 7) % 10),
    delay: (i % 5) * 60,
    color: COLORS[i % COLORS.length],
    shape: SHAPES[i % SHAPES.length],
    spin: i % 2 ? 200 : -160,
  };
});
const TWINKLES = [
  { x: -120, y: -40, d: 0 }, { x: 118, y: -55, d: 400 }, { x: -95, y: 55, d: 800 },
  { x: 105, y: 48, d: 1200 }, { x: 0, y: -88, d: 600 },
];

export default function Celebration() {
  return (
    <div className="gfy-celebrate pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
      <style>{`
        @keyframes gfy-burst {
          0% { transform: translate(0, 0) scale(0.3) rotate(0deg); opacity: 0; }
          15% { opacity: 1; }
          70% { opacity: 1; }
          100% { transform: translate(var(--dx), calc(var(--dy) + 40px)) scale(1) rotate(var(--spin)); opacity: 0; }
        }
        @keyframes gfy-twinkle {
          0%, 100% { transform: scale(0.4); opacity: 0; }
          50% { transform: scale(1); opacity: 1; }
        }
        @keyframes gfy-glow {
          0% { transform: scale(0.6); opacity: 0; }
          40% { opacity: 0.9; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes gfy-pop {
          0% { transform: scale(0.85); }
          50% { transform: scale(1.08); }
          100% { transform: scale(1); }
        }
        .gfy-pop { animation: gfy-pop 700ms cubic-bezier(0.3, 1.4, 0.5, 1) both; }
        @media (prefers-reduced-motion: reduce) { .gfy-celebrate { display: none; } .gfy-pop { animation: none; } }
      `}</style>
      <span
        className="absolute w-36 h-36 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(242,193,78,0.55), rgba(242,193,78,0) 70%)', animation: 'gfy-glow 1.4s ease-out 2 both' }}
      />
      {PIECES.map((p, i) => (
        <span
          key={i}
          className="absolute font-bold leading-none"
          style={{
            '--dx': `${p.dx}px`,
            '--dy': `${p.dy}px`,
            '--spin': `${p.spin}deg`,
            color: p.color,
            fontSize: p.size,
            animation: `gfy-burst 1.8s cubic-bezier(0.2, 0.7, 0.3, 1) ${p.delay}ms both`,
          }}
        >
          {p.shape}
        </span>
      ))}
      {TWINKLES.map((t, i) => (
        <span
          key={`t${i}`}
          className="absolute text-gold-400 text-base"
          style={{ left: '50%', top: '50%', marginLeft: t.x - 8, marginTop: t.y - 8, animation: `gfy-twinkle 1.6s ease-in-out ${1500 + t.d}ms 3 both` }}
        >
          ✦
        </span>
      ))}
    </div>
  );
}

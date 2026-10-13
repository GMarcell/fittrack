/**
 * Tiny inline SVG sparkline. Server-renderable — no chart library, no client JS.
 */
export function Sparkline({
  values,
  width = 76,
  height = 26,
  className,
}: {
  /** Oldest → newest. */
  values: number[];
  width?: number;
  height?: number;
  className?: string;
}) {
  if (values.length === 0) return null;

  const padding = 3;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;

  const points = values.map((value, index) => {
    const x =
      values.length === 1
        ? width / 2
        : padding + (index / (values.length - 1)) * (width - padding * 2);
    const y =
      span === 0
        ? height / 2
        : height - padding - ((value - min) / span) * (height - padding * 2);
    return { x, y };
  });

  const path = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const last = points[points.length - 1];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {points.length > 1 && (
        <polyline
          points={path}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      <circle cx={last.x} cy={last.y} r={2.5} fill="var(--primary)" />
    </svg>
  );
}

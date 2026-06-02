interface SpeedGaugeProps {
  /** Current value as a percentage 0–100 */
  value: number
  /** Target percentage (optional tick mark) */
  target?: number
  /** Label shown below the number */
  label?: string
  /** Unit shown next to the number (e.g. "%" or "RPM") */
  unit?: string
}

const CX = 70
const CY = 70
const R = 50
const TRACK = 12

// Clock-angle convention: 0° = top (12 o'clock), increasing clockwise.
const START_ANGLE = 225 // 7–8 o'clock
const SWEEP = 270       // spans to 4–5 o'clock (135°)

function clockToXY(deg: number): [number, number] {
  const rad = (deg * Math.PI) / 180
  return [CX + R * Math.sin(rad), CY - R * Math.cos(rad)]
}

function arcPath(startDeg: number, endDeg: number): string {
  const span = endDeg - startDeg
  if (Math.abs(span) < 0.5) return ""
  const [sx, sy] = clockToXY(startDeg)
  const [ex, ey] = clockToXY(endDeg)
  const largeArc = span > 180 ? 1 : 0
  return `M ${sx.toFixed(2)} ${sy.toFixed(2)} A ${R} ${R} 0 ${largeArc} 1 ${ex.toFixed(2)} ${ey.toFixed(2)}`
}

export function SpeedGauge({
  value,
  target,
  label = "Speed",
  unit = "%",
}: SpeedGaugeProps) {
  const clamped = Math.max(0, Math.min(100, value))
  const valueAngle = START_ANGLE + (clamped / 100) * SWEEP
  const bgPath = arcPath(START_ANGLE, START_ANGLE + SWEEP)
  const fillPath = clamped > 0 ? arcPath(START_ANGLE, valueAngle) : ""

  const color =
    clamped >= 80 ? "#22c55e" : clamped >= 55 ? "#eab308" : "#ef4444"

  // Target tick
  let targetPt: [number, number] | null = null
  if (target !== undefined) {
    const targetAngle = START_ANGLE + (Math.max(0, Math.min(100, target)) / 100) * SWEEP
    targetPt = clockToXY(targetAngle)
  }

  // 0% and 100% endpoint markers (small outer ticks)
  const [s0x, s0y] = clockToXY(START_ANGLE)
  const [s100x, s100y] = clockToXY(START_ANGLE + SWEEP)

  return (
    <div className="flex flex-col items-center">
      <svg
        viewBox="12 12 116 104"
        className="w-full max-w-[180px]"
        role="img"
        aria-label={`${label}: ${Math.round(clamped)}${unit}`}
      >
        {/* Background track */}
        <path
          d={bgPath}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={TRACK}
          strokeLinecap="round"
        />
        {/* Fill track */}
        {fillPath && (
          <path
            d={fillPath}
            fill="none"
            stroke={color}
            strokeWidth={TRACK}
            strokeLinecap="round"
            style={{ transition: "all 0.6s ease" }}
          />
        )}
        {/* Target tick */}
        {targetPt && (
          <circle
            cx={targetPt[0]}
            cy={targetPt[1]}
            r={4}
            fill="hsl(var(--background))"
            stroke="#6b7280"
            strokeWidth={1.5}
          />
        )}
        {/* 0% label */}
        <text
          x={s0x - 4}
          y={s0y + 14}
          textAnchor="middle"
          fontSize="9"
          fill="hsl(var(--muted-foreground))"
          fontFamily="inherit"
        >
          0
        </text>
        {/* 100% label */}
        <text
          x={s100x + 4}
          y={s100y + 14}
          textAnchor="middle"
          fontSize="9"
          fill="hsl(var(--muted-foreground))"
          fontFamily="inherit"
        >
          100
        </text>
        {/* Value */}
        <text
          x={CX}
          y={CY + 14}
          textAnchor="middle"
          fontSize="28"
          fontWeight="700"
          fill={color}
          fontFamily="inherit"
          style={{ transition: "fill 0.6s ease" }}
        >
          {Math.round(clamped)}
        </text>
        {/* Unit */}
        <text
          x={CX}
          y={CY + 30}
          textAnchor="middle"
          fontSize="12"
          fill="hsl(var(--muted-foreground))"
          fontFamily="inherit"
        >
          {unit}
        </text>
      </svg>
      <span className="text-xs font-medium text-muted-foreground -mt-1">
        {label}
      </span>
    </div>
  )
}

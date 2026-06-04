interface ProgressRingProps {
  percent: number
  label?: string
  sublabel?: string
  size?: number
}

export default function ProgressRing({
  percent,
  label,
  sublabel,
  size = 120,
}: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(100, percent))
  const stroke = 10
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const dash = (clamped / 100) * circumference
  const center = size / 2
  const mainLabel = label ?? `${Math.round(clamped)}%`

  return (
    <div className="ql-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="ql-ring__svg">
        <circle
          className="ql-ring__track"
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          strokeWidth={stroke}
        />
        <circle
          className="ql-ring__bar"
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </svg>
      <div className="ql-ring__label">
        <span className="ql-ring__value">{mainLabel}</span>
        {sublabel != null && <span className="ql-ring__sub">{sublabel}</span>}
      </div>
    </div>
  )
}

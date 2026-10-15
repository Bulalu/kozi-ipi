type IconProps = { className?: string }

function Stroke({
  children,
  className = "",
  strokeWidth = 2.5,
}: IconProps & { children: React.ReactNode; strokeWidth?: number }) {
  return (
    <svg
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
      viewBox="0 0 24 24"
    >
      {children}
    </svg>
  )
}

export function ArrowRightIcon({ className }: IconProps) {
  return (
    <Stroke className={className} strokeWidth={3}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </Stroke>
  )
}

export function SearchIcon({ className }: IconProps) {
  return (
    <Stroke className={className}>
      <circle cx={11} cy={11} r={7} />
      <path d="m20 20-3.5-3.5" />
    </Stroke>
  )
}

export function MenuIcon({ className }: IconProps) {
  return (
    <Stroke className={className} strokeWidth={2.75}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </Stroke>
  )
}

export function InfoIcon({ className }: IconProps) {
  return (
    <Stroke className={className} strokeWidth={2}>
      <circle cx={12} cy={12} r={9} />
      <path d="M12 11v5M12 8h.01" />
    </Stroke>
  )
}

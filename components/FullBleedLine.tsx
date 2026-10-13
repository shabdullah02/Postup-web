type FullBleedLineProps = {
  className?: string
}

export default function FullBleedLine({ className = "" }: FullBleedLineProps) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute left-1/2 z-30 h-px w-screen -translate-x-1/2 bg-[var(--border-color)] ${className}`}
    />
  )
}
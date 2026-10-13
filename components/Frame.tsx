import type { ReactNode } from "react"

type FrameProps = {
  children: ReactNode
}

export default function Frame({ children }: FrameProps) {
  return (
    <div className="relative mx-auto min-h-screen max-w-[75rem] border-x border-[var(--border-color)] bg-[var(--page-background)]">
      {children}
    </div>
  )
}

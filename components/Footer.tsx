import FullBleedLine from "@/components/FullBleedLine"
import { content } from "@/lib/content"

export default function Footer() {
  return (
    <footer className="relative px-4 py-8 text-center text-sm text-[var(--secondary-text)]">
      <FullBleedLine className="top-0" />
      <p>{content.footer}</p>
    </footer>
  )
}

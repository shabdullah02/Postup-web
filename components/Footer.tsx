import FullBleedLine from "@/components/FullBleedLine"
import { content } from "@/lib/content"
import Link from "next/link"

export default function Footer() {
  return (
    <footer className="relative px-5 py-12 text-sm text-[var(--secondary-text)]">
      <FullBleedLine className="top-0" />
      <div className="mx-auto grid max-w-6xl gap-9 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Link href="/" className="font-semibold text-[var(--primary-text)]">{content.appName}</Link>
          <p className="mt-3 max-w-xs leading-6">{content.subheadline}</p>
        </div>
        <div>
          <h2 className="font-semibold text-[var(--primary-text)]">Product</h2>
          <ul className="mt-3 space-y-2">
            <li><Link href="/#features" className="hover:text-foreground">Features</Link></li>
            <li><Link href="/pricing" className="hover:text-foreground">Pricing</Link></li>
            <li><Link href="/signup" className="hover:text-foreground">Get started</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="font-semibold text-[var(--primary-text)]">Company</h2>
          <ul className="mt-3 space-y-2">
            <li><Link href="/about" className="hover:text-foreground">About</Link></li>
            <li><Link href="/contact" className="hover:text-foreground">Contact</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="font-semibold text-[var(--primary-text)]">Legal</h2>
          <ul className="mt-3 space-y-2">
            <li><Link href="/privacy" className="hover:text-foreground">Privacy</Link></li>
            <li><Link href="/terms" className="hover:text-foreground">Terms</Link></li>
            <li><Link href="/data-deletion" className="hover:text-foreground">Data deletion</Link></li>
          </ul>
        </div>
      </div>
      <p className="mx-auto mt-10 max-w-6xl border-t border-border pt-5">{content.footer}</p>
    </footer>
  )
}

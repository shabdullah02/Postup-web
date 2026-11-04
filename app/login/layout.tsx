import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to your Postup social publishing workspace.",
  robots: { index: false, follow: false },
}

export default function LoginLayout({ children }: LayoutProps<"/login">) {
  return children
}
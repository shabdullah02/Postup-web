import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Create your account",
  description: "Create a Postup account and start planning your social publishing workflow.",
}

export default function SignupLayout({ children }: LayoutProps<"/signup">) {
  return children
}
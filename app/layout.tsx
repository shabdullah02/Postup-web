import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Frame from "@/components/Frame";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CookieBanner from "@/components/CookieBanner";
import AccountBanners from "@/components/AccountBanners";
import { AuthProvider } from "@/components/AuthProvider";
import { BillingProvider } from "@/components/BillingProvider";
import { PlanLimitPrompt } from "@/components/BillingNotices";
import { content } from "@/lib/content";

const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: `${content.appName} | Social publishing, made clear`,
    template: `%s | ${content.appName}`,
  },
  description: content.subheadline,
  openGraph: {
    type: "website",
    siteName: content.appName,
    title: `${content.appName} | Social publishing, made clear`,
    description: content.subheadline,
    images: [{ url: "/opengraph-image" }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${content.appName} | Social publishing, made clear`,
    description: content.subheadline,
  },
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-[var(--gutter-background)] text-[var(--primary-text)]">
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem("theme")==="dark"){document.documentElement.classList.add("dark")}}catch(e){}`,
          }}
        />
        <Suspense fallback={<main className="min-h-screen p-6" role="status">Loading...</main>}>
          <AuthProvider>
            <BillingProvider>
              <Frame>
                <Navbar />
                <AccountBanners />
                <div>{children}</div>
                <Footer />
                <CookieBanner />
                <PlanLimitPrompt />
              </Frame>
            </BillingProvider>
          </AuthProvider>
        </Suspense>
      </body>
    </html>
  );
}
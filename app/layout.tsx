import type { Metadata } from "next";
import "./globals.css";
import Frame from "@/components/Frame";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CookieBanner from "@/components/CookieBanner";
import { AuthProvider } from "@/components/AuthProvider";
import { content } from "@/lib/content";

export const metadata: Metadata = {
  title: content.appName,
  description: content.subheadline,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <body className="min-h-full bg-[var(--gutter-background)] text-[var(--primary-text)]">
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem("theme")==="dark"){document.documentElement.classList.add("dark")}}catch(e){}`,
          }}
        />
        <AuthProvider>
          <Frame>
            <Navbar />
            <div>{children}</div>
            <Footer />
            <CookieBanner />
          </Frame>
        </AuthProvider>
      </body>
    </html>
  );
}
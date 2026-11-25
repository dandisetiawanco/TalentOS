import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { AppProviders } from "@/lib/auth-context";
import { THEME_INIT_SCRIPT } from "@/lib/theme";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: {
    default: "TalentOS | Better hiring. Built on intelligence.",
    template: "%s | TalentOS",
  },
  description:
    "A unified recruitment workspace designed to simplify hiring operations, organize candidate information, and support human-led recruitment decisions.",
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: "TalentOS | Better hiring. Built on intelligence.",
    description:
      "Manage recruitment workflows, inspect evidence-based candidate qualifications, coordinate interviews, and review hiring analytics.",
    type: "website",
    images: [{ url: "/og-image.svg", width: 1200, height: 630, alt: "TalentOS recruitment platform" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <head>
        <meta name="color-scheme" content="light dark" />
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-dvh bg-[var(--color-canvas)] text-[var(--color-text)] antialiased">
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}

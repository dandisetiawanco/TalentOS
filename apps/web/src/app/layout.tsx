import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { AppProviders } from "@/lib/auth-context";
import { THEME_INIT_SCRIPT } from "@/lib/theme";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: {
    default: "TalentOS · A better way to hire.",
    template: "%s · TalentOS",
  },
  description:
    "Bring your hiring team, candidates, and recruitment workflows together in one thoughtful workspace.",
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: "TalentOS: A better way to hire.",
    description:
      "Bring your hiring team, candidates, and recruitment workflows together in one thoughtful workspace.",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "TalentOS recruitment workspace" }],
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
      <body className="surface-canvas min-h-dvh text-[var(--color-text)] antialiased">
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}

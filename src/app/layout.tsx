import type { Metadata, Viewport } from "next";
import { Cinzel, Cormorant_Garamond, Manrope } from "next/font/google";
import { Suspense } from "react";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteHeaderFallback } from "@/components/layout/SiteHeaderFallback";
import { SkipLink } from "@/components/layout/SkipLink";
import { demoRobots } from "@/lib/metadata";
import { site } from "@/lib/site";
import "./globals.css";

const cinzel = Cinzel({
  subsets: ["latin"],
  variable: "--font-cinzel",
  display: "swap",
  weight: ["400", "500", "600"],
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-cormorant",
  display: "swap",
  weight: ["500", "600"],
  style: ["normal", "italic"],
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: {
    default: site.title,
    template: "%s · Luna Fae Leathers",
  },
  description: site.description,
  applicationName: site.title,
  robots: demoRobots,
  authors: [{ name: "Noctaris Innovations" }],
  creator: "Noctaris Innovations",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#100E12",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${cinzel.variable} ${cormorant.variable} ${manrope.variable}`}>
      <body className="flex min-h-dvh flex-col antialiased">
        <SkipLink />
        <div className="sticky top-0 z-40">
          <Suspense fallback={<SiteHeaderFallback />}>
            <SiteHeader />
          </Suspense>
        </div>
        <main id="main" tabIndex={-1} className="flex-1 outline-none">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}

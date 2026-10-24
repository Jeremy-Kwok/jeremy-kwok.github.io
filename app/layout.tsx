import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { INTRO, SITE_NAME, SITE_URL } from "@/lib/site";
import { ogImage } from "@/lib/ogCard";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// A page that sets its own openGraph replaces this block wholesale, images
// included, so each of those pages names its siteName and image again.
export const metadata: Metadata = {
  title: {
    default: SITE_NAME,
    template: `%s — ${SITE_NAME}`,
  },
  description: INTRO,
  metadataBase: new URL(SITE_URL),
  openGraph: {
    title: SITE_NAME,
    description: INTRO,
    siteName: SITE_NAME,
    type: "website",
    url: "/",
    images: [ogImage("site", SITE_NAME)],
  },
  twitter: { card: "summary_large_image", images: [ogImage("site", SITE_NAME)] },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="antialiased min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}

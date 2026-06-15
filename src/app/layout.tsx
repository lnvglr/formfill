import type { Viewport } from "next";
import {
  IBM_Plex_Mono,
  IBM_Plex_Sans,
  IBM_Plex_Sans_Arabic,
  IBM_Plex_Sans_Hebrew,
} from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-sans-latin",
  subsets: ["latin", "latin-ext", "cyrillic"],
  weight: ["300", "400", "500", "600"],
});

const ibmPlexSansArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-sans-arabic",
  subsets: ["arabic"],
  weight: ["300", "400", "500", "600"],
});

const ibmPlexSansHebrew = IBM_Plex_Sans_Hebrew({
  variable: "--font-sans-hebrew",
  subsets: ["hebrew"],
  weight: ["300", "400", "500", "600"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      className={`${ibmPlexSans.variable} ${ibmPlexSansArabic.variable} ${ibmPlexSansHebrew.variable} ${ibmPlexMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col font-sans">
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}

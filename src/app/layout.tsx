import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { connection } from "next/server";
import "./globals.css";
import { SITE_URL } from "@/lib/seo/site";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: {
    template: "%s | VibeLock",
    default: "VibeLock | Modern Dhaka Streetwear",
  },
  description:
    "Bangladesh men's streetwear brand for modern Dhaka youth. Minimal, confident, and premium.",
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: "VibeLock | Modern Dhaka Streetwear",
    description: "Bangladesh men's streetwear brand for modern Dhaka youth.",
    url: SITE_URL,
    siteName: "VibeLock",
    locale: "en_BD",
    type: "website",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  if (process.env.NODE_ENV === "production") await connection();

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} font-sans antialiased min-h-screen bg-background text-foreground flex flex-col`}
      >
        {children}
      </body>
    </html>
  );
}

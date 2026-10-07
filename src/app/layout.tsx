import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

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
  metadataBase: new URL("https://vibelock.com.bd"),
  openGraph: {
    title: "VibeLock | Modern Dhaka Streetwear",
    description: "Bangladesh men's streetwear brand for modern Dhaka youth.",
    url: "https://vibelock.com.bd",
    siteName: "VibeLock",
    locale: "en_BD",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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

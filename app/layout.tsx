import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

const display = localFont({
  src: "./fonts/anton-latin.woff2",
  weight: "400",
  variable: "--font-display",
  display: "swap",
});

const body = localFont({
  src: "./fonts/space-grotesk-latin.woff2",
  weight: "300 700",
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Brozoflix",
    template: "%s · Brozoflix",
  },
  description: "Do we already have this movie?",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Brozoflix",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
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
    <html lang="en" className={`dark ${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}

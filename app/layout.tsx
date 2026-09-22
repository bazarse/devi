import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import PosLayout from "@/components/pos-layout";
import CacheCleaner from "@/components/cache-cleaner";
import PushNotificationProvider from "@/components/push-notification-provider";
import NetworkStatusDetector from "@/components/network-status-detector";

const inter = Inter({ subsets: ["latin"] });


export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0f172a",
};

export const metadata: Metadata = {
  title: "Devi Mobile - Retail POS & Multi-Store Management",
  description: "Retail store operations, IMEI inventory, and POS billing system for Devi Mobile.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Devi POS",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate, proxy-revalidate, max-age=0" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
      </head>
      <body className={`${inter.className} min-h-screen bg-slate-100 text-slate-900`}>
        <NetworkStatusDetector />
        <CacheCleaner />
        <PushNotificationProvider />
        <PosLayout>
          {children}
        </PosLayout>
      </body>

    </html>
  );
}


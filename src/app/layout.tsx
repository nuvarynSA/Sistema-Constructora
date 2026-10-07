import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ServiceWorkerCleanup } from "@/components/shared/service-worker-cleanup";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NEXORA - Sistema de Gestión de Pedidos y Licitaciones",
  description: "Sistema integral para gestión de pedidos (RQI) y licitaciones (OPL)",
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'NEXORA',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    siteName: 'NEXORA',
    title: 'NEXORA - Sistema de Gestión',
    description: 'Sistema integral para gestión de pedidos (RQI) y licitaciones (OPL)',
  },
  twitter: {
    card: 'summary',
    title: 'NEXORA - Sistema de Gestión',
    description: 'Sistema integral para gestión de pedidos (RQI) y licitaciones (OPL)',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pwaDisabled =
    process.env.NODE_ENV === "development";

  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <meta name="application-name" content="NEXORA" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="NEXORA" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#3b82f6" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ServiceWorkerCleanup enabled={pwaDisabled} />
          {children}
          <Toaster />
          <SonnerToaster />
        </ThemeProvider>
      </body>
    </html>
  );
}

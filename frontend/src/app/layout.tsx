import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { NavigationProvider } from "@/components/NavigationProvider";
import { ThemeProvider } from "@/contexts/ThemeContext";
import ClientOnly from "@/components/ClientOnly";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import ExtensionDetector from "@/components/ExtensionDetector";
import ExtensionErrorHandler from "@/components/ExtensionErrorHandler";
import Script from "next/script";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "6FB Booking Platform",
  description: "Six Figure Barber booking and analytics platform",
  keywords: "barber, booking, appointments, six figure barber, analytics",
  authors: [{ name: "6FB Platform Team" }],
  robots: "index, follow",
  other: {
    // Security headers
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_TRACKING_ID;

  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        {/* Google Analytics */}
        {GA_TRACKING_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_TRACKING_ID}', {
                  page_title: document.title,
                  page_location: window.location.href,
                  send_page_view: true
                });
              `}
            </Script>
          </>
        )}

        <ErrorBoundary>
          <ThemeProvider>
            <AuthProvider>
              <NavigationProvider>
                <ClientOnly>
                  {children}
                </ClientOnly>
              </NavigationProvider>
            </AuthProvider>
            <ExtensionDetector />
            <ExtensionErrorHandler />
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}

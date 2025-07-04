import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { NavigationProvider } from "@/components/NavigationProvider";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { StripeProvider } from "@/providers/StripeProvider";
import ClientOnly from "@/components/ClientOnly";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { CustomerAuthProvider } from "@/components/customer/CustomerAuthProvider";
import LayoutWrapper from "@/components/LayoutWrapper";
import ExtensionDetector from "@/components/ExtensionDetector";
import ExtensionErrorHandler from "@/components/ExtensionErrorHandler";
import HighContrastEnforcer from "@/components/HighContrastEnforcer";
import Script from "next/script";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Booked Barber Platform",
  description: "Six Figure Barber booking and analytics platform",
  keywords: "barber, booking, appointments, six figure barber, analytics",
  authors: [{ name: "Booked Barber Team" }],
  robots: "index, follow",
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/icons/icon-144x144.png',
  },
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
        className={`${inter.variable} antialiased`}
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
            <NotificationProvider>
              <AuthProvider>
                <CustomerAuthProvider>
                  <NavigationProvider>
                    <StripeProvider>
                      <LayoutWrapper>
                        {children}
                      </LayoutWrapper>
                    </StripeProvider>
                  </NavigationProvider>
                </CustomerAuthProvider>
              </AuthProvider>
              <ExtensionDetector />
              <ExtensionErrorHandler />
              {/* <HighContrastEnforcer /> Disabled - conflicts with landing page */}
            </NotificationProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}

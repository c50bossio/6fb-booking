import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
// Temporarily disabled for deployment
// import { AuthProvider } from "@/components/AuthProvider";
// import Navigation from "@/components/Navigation";

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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* Temporarily simplified for deployment */}
        <div className="min-h-screen">
          <nav className="bg-gray-800 text-white p-4">
            <div className="container mx-auto">
              <h1 className="text-xl font-bold">6FB Platform</h1>
            </div>
          </nav>
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}

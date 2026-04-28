import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import CookieBanner from "@/components/layout/CookieBanner";
import SmoothScrollProvider from "@/components/layout/SmoothScrollProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Typescribe — AI-Powered Movie Reviews",
  description: "Discover your next favorite movie with AI-powered reviews, real ratings, and community insights.",
  icons: { icon: "/logo.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#050507] text-white`}>
        {/* Subtle ambient glow */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-[#d4a853]/[0.03] rounded-full blur-[120px]" />
        </div>
        <AuthProvider>
          <SmoothScrollProvider>
            <div className="min-h-screen bg-[#050507] flex flex-col">
              <Navbar />
              <main className="flex-1">{children}</main>
              <Footer />
              <CookieBanner />
            </div>
          </SmoothScrollProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

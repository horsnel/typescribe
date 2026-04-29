import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import CookieBanner from "@/components/layout/CookieBanner";
import NativeScrollReveal from "@/components/layout/NativeScrollReveal";
import NotificationPanel from "@/components/community/NotificationPanel";

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
    <html lang="en" className="dark h-full" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#050507] text-white h-full overflow-hidden`}>
        {/* Subtle ambient glow */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-[#d4a853]/[0.03] rounded-full blur-[120px]" />
        </div>
        <AuthProvider>
          <NativeScrollReveal>
            {/* App Shell: locked viewport — navbar stays, content scrolls inside */}
            <div className="h-full flex flex-col bg-[#050507]">
              <Navbar />
              {/* Scrollable content area — footer lives INSIDE this scroll container */}
              <main className="flex-1 overflow-y-auto">
                {children}
                <Footer />
              </main>
              <CookieBanner />
              <NotificationPanel />
            </div>
          </NativeScrollReveal>
        </AuthProvider>
      </body>
    </html>
  );
}

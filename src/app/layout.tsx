import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import SessionProvider from "@/components/SessionProvider";
import NavBar from "@/components/NavBar";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "QiGong Now",
  description: "Practice qigong with your group, any hour of the day.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${geist.variable} antialiased bg-stone-950 text-stone-100 min-h-screen`}>
        <SessionProvider>
          <NavBar />
          <main className="max-w-4xl mx-auto px-6 py-10">{children}</main>
        </SessionProvider>
      </body>
    </html>
  );
}

// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { Geist, Geist_Mono } from "next/font/google";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "vvault — send, store & track your music",
  description:
    "vvault is a vault for producers and artists to store beats, build packs, send campaigns and track opens, clicks & downloads — plus a Chrome extension for Gmail.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-full bg-[#050509] text-slate-100 font-sans`}
      >
        {children}
      </body>
    </html>
  );
}

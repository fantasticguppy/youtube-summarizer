import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// Allow up to 5 minutes for server actions (AssemblyAI transcription can take 30-130+ seconds)
// This is required for Vercel deployment
// Note: Vercel Hobby plan max is 60s, Pro plan allows up to 300s
export const maxDuration = 300;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "YouTube Summarizer",
  description: "Extract transcripts and AI-generated summaries from YouTube videos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background`}
      >
        <div className="container mx-auto max-w-2xl px-4 py-8">
          {children}
        </div>
      </body>
    </html>
  );
}

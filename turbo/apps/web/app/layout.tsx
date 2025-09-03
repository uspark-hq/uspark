import type { Metadata } from "next";
import localFont from "next/font/local";
import { ClerkProvider } from "@clerk/nextjs";
import { getClerkPublishableKey } from "../src/lib/clerk-config";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "uSpark - AI Assistant That Changes Everything",
  description:
    "Join the waiting list for uSpark, the next-generation AI assistant that understands your context, learns your patterns, and delivers intelligent automation at scale.",
  keywords:
    "AI assistant, artificial intelligence, productivity, automation, workflow optimization",
  openGraph: {
    title: "uSpark - AI Assistant That Changes Everything",
    description:
      "The next-generation AI assistant that understands your context and supercharges your productivity.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider publishableKey={getClerkPublishableKey()}>
      <html lang="en">
        <body className={`${geistSans.variable} ${geistMono.variable}`}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { getClerkPublishableKey } from "../src/lib/clerk-config";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
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
    <ClerkProvider
      publishableKey={getClerkPublishableKey()}
      afterSignInUrl="/"
      afterSignUpUrl="/"
    >
      <html lang="en">
        <body className={inter.className}>{children}</body>
      </html>
    </ClerkProvider>
  );
}

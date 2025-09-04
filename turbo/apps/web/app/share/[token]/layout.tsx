import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../../globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Shared Document - uSpark",
  description: "View shared document on uSpark",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ShareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
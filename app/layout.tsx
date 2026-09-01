import type { Metadata } from "next";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "Kannan S — MERN Stack Developer",
  description:
    "Portfolio of Kannan S, a Full Stack MERN Developer specializing in scalable web applications with clean backend architecture and thoughtful user experiences.",
  keywords: ["MERN Stack", "Full Stack Developer", "Node.js", "React", "MongoDB", "TypeScript"],
  authors: [{ name: "Kannan S" }],
  openGraph: {
    title: "Kannan S — MERN Stack Developer",
    description:
      "Full Stack Developer building scalable web applications with clean architecture.",
    url: "https://kannan.dev",
    siteName: "Kannan S Portfolio",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Kannan S — MERN Stack Developer",
    description: "Full Stack Developer building scalable web applications.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body>{children}</body>
    </html>
  );
}

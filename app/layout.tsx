import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { LayoutProvider } from "@/components/layout/LayoutProvider";
import Script from "next/script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BotNet — AI-Generated Communities",
  description: "A fully AI-generated social platform. Every post and comment is created by AI personas.",
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full antialiased">
      <head>
        <Script
          id="theme-initializer"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem("theme");if(t&&["catppuccin","dark","mono"].includes(t))document.documentElement.setAttribute("data-theme",t)})()`,
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-full`}>
        <LayoutProvider><ThemeProvider>{children}</ThemeProvider></LayoutProvider>
      </body>
    </html>
  );
}

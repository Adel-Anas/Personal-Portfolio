import { Geist, Geist_Mono } from "next/font/google";
import { site } from "@/data/site";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" });

export const metadata = {
  title: site.title,
  description: site.description,
  applicationName: site.name,
  authors: [{ name: site.name }],
  openGraph: {
    title: site.title,
    description: site.description,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: site.title,
    description: site.description,
  },
};

export const viewport = {
  themeColor: "#050505",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable} js-reveal`} suppressHydrationWarning>
      <body>
        <noscript>
          <style>{`.js-reveal [data-reveal]{visibility:visible!important}`}</style>
        </noscript>
        {children}
      </body>
    </html>
  );
}

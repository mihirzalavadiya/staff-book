import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk, Instrument_Serif, Noto_Sans_Devanagari, Tiro_Devanagari_Hindi } from "next/font/google";
import Script from "next/script";
import { AppProviders } from "@/lib/providers";
import "./globals.css";

const instrument = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
  weight: "variable",
});

const tiro = Tiro_Devanagari_Hindi({
  variable: "--font-tiro",
  subsets: ["devanagari", "latin"],
  weight: "400",
  style: ["normal", "italic"],
});

const devanagari = Noto_Sans_Devanagari({
  variable: "--font-devanagari",
  subsets: ["devanagari", "latin"],
  weight: "variable",
});

export const metadata: Metadata = {
  title: "Staffbook",
  description:
    "A shared daily attendance register between households and the people who work in them.",
  applicationName: "Staffbook",
  manifest: "/manifest.webmanifest",
  icons: { icon: [{ url: "/icon.svg", type: "image/svg+xml" }, { url: "/icon-192.png", sizes: "192x192" }], apple: "/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "Staffbook", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#E6DAC6",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const themeInit = `(function(){try{var t=localStorage.getItem('sb.theme');if(t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.dataset.theme='dark'}}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${instrument.variable} ${hanken.variable} ${tiro.variable} ${devanagari.variable}`}
    >
      <body>
        {/* Sets dark mode before first paint so the page never flashes light. */}
        <Script id="theme-init" strategy="beforeInteractive">
          {themeInit}
        </Script>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}

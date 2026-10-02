import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Figtree, Noto_Sans_Devanagari } from "next/font/google";
import { AppProviders } from "@/lib/providers";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: "variable",
  axes: ["opsz"],
});

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
  weight: "variable",
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
  themeColor: "#FFE0CC",
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
      className={`${bricolage.variable} ${figtree.variable} ${devanagari.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}

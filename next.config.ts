import type { NextConfig } from "next";

const dev = process.env.NODE_ENV !== "production";

/**
 * Content Security Policy. Scripts, styles and fonts come only from this site
 * (next/font self-hosts the fonts); the browser talks only to this site and
 * Supabase (realtime runs over wss). Next.js inlines small bootstrap scripts,
 * hence 'unsafe-inline'; dev also needs eval and the HMR socket.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self' https://*.supabase.co wss://*.supabase.co${dev ? " ws: http://localhost:*" : ""}`,
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(dev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // Older browsers that ignore frame-ancestors: never render inside someone else's frame.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Other sites only ever see our origin, never a path (worker links live in the path).
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Location is used to set the home's place. Turn the microphone on here when voice notes ship.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self), payment=(), usb=()" },
  ...(dev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]),
];

const nextConfig: NextConfig = {
  reactCompiler: true,
  turbopack: { root: __dirname },
  // Dev only: lets a phone on the same Wi-Fi load the app for testing.
  allowedDevOrigins: ["192.168.0.*", "10.0.0.*", "localhost"],
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        // A worker's link is their login: keep it out of search results and never send it as a referrer.
        source: "/w/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
          { key: "Referrer-Policy", value: "no-referrer" },
        ],
      },
    ];
  },
};

export default nextConfig;

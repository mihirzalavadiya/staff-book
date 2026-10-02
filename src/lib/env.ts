/**
 * Public environment, safe in the browser. Next.js inlines these at build
 * time, so each must be referenced as a literal `process.env.NAME`.
 */
function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

export const publicEnv = {
  get SUPABASE_URL() {
    return required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
  },
  get SUPABASE_ANON_KEY() {
    return required("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  },
  get APP_URL() {
    return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  },
  get VAPID_PUBLIC_KEY() {
    return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
  },
};

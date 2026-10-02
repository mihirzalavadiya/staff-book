import "server-only";

function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

/** Server-only secrets. The `server-only` import makes a client import a build error. */
export const env = {
  get DATABASE_URL() {
    return required("DATABASE_URL", process.env.DATABASE_URL);
  },
  get SUPABASE_SERVICE_ROLE_KEY() {
    return required("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY);
  },
  get CRON_SECRET() {
    return process.env.CRON_SECRET ?? "";
  },
  get VAPID_PRIVATE_KEY() {
    return process.env.VAPID_PRIVATE_KEY ?? "";
  },
  get VAPID_SUBJECT() {
    return process.env.VAPID_SUBJECT ?? "mailto:hello@example.com";
  },
};

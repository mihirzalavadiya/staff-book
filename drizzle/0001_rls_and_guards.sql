-- The browser never talks to the Data API; all access goes through the Next.js
-- server with Drizzle. Enabling RLS with no policies makes PostgREST expose
-- nothing to the anon/authenticated roles, while the postgres role still works.
ALTER TABLE "households" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "workers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "engagements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "attendance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "advances" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "settlements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "push_subscriptions" ENABLE ROW LEVEL SECURITY;

-- Attendance is append-only. Block UPDATE and DELETE at the database level so
-- no code path, present or future, can rewrite history.
CREATE OR REPLACE FUNCTION attendance_is_append_only() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'attendance rows are append-only';
END;
$$;

CREATE TRIGGER attendance_no_update
  BEFORE UPDATE OR DELETE ON "attendance"
  FOR EACH ROW EXECUTE FUNCTION attendance_is_append_only();

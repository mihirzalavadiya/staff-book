-- Attendance stays append-only. The only exception is an explicit, transaction-
-- scoped purge used by test teardown: `SET LOCAL staffbook.allow_purge = 'on'`.
-- Application code never sets this.
CREATE OR REPLACE FUNCTION attendance_is_append_only() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF current_setting('staffbook.allow_purge', true) = 'on' THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'attendance rows are append-only';
END;
$$;

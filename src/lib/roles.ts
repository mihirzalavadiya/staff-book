import type { Role } from "./types";

export const ROLES: Role[] = ["cook", "maid", "driver", "milk", "other"];

/** Display name for a role: the custom label for "other", else the translated role. */
export function roleName(
  t: (key: string) => string,
  role: Role,
  roleLabel?: string | null,
): string {
  const custom = roleLabel?.trim();
  return role === "other" && custom ? custom : t(`roles.${role}`);
}

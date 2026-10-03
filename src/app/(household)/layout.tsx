import { redirect } from "next/navigation";
import { AppShell } from "@/components/household/AppShell";
import { HouseholdStore } from "@/components/household/HouseholdStore";
import { getAuthUser } from "@/server/auth/supabase";
import { loadHouseholdState } from "@/server/queries/household";

/** Loads the household ledger once per request and hands it to the client store. */
export default async function HouseholdLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthUser();
  if (!user) redirect("/login");
  const state = await loadHouseholdState(user.id);
  if (!state) redirect("/onboarding");
  // Homes created before flat numbers existed finish their details once.
  if (!state.household.flat) redirect("/onboarding");

  return (
    <HouseholdStore initialState={state}>
      <AppShell>{children}</AppShell>
    </HouseholdStore>
  );
}

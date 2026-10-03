import { OnboardingForm } from "@/components/onboarding/OnboardingForm";
import { getAuthUser } from "@/server/auth/supabase";
import { findHouseholdByOwner } from "@/server/queries/household";

/** New homes start empty; older homes come back here once to add their flat number. */
export default async function OnboardingPage() {
  const user = await getAuthUser();
  const existing = user ? await findHouseholdByOwner(user.id) : null;
  return (
    <OnboardingForm
      initial={{
        ownerName: existing?.ownerName ?? "",
        name: existing?.name ?? "",
        flat: existing?.flat ?? "",
        complete: Boolean(existing),
      }}
    />
  );
}

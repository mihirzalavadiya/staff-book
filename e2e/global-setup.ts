import { writeFileSync } from "node:fs";
import { createFixture } from "../tests/fixtures/household";
import { FIXTURE_PATH } from "./support";

export default async function globalSetup() {
  const fixture = await createFixture({ withAuthUser: true });
  writeFileSync(FIXTURE_PATH, JSON.stringify(fixture));
}

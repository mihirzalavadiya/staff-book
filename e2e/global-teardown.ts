import { existsSync, rmSync } from "node:fs";
import { destroyFixture } from "../tests/fixtures/household";
import { FIXTURE_PATH, loadFixture } from "./support";

export default async function globalTeardown() {
  if (!existsSync(FIXTURE_PATH)) return;
  await destroyFixture(loadFixture(), { withAuthUser: true });
  rmSync(FIXTURE_PATH);
}

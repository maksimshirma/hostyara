import { Pool } from "pg";
import { loadEnv } from "../../bff/src/config/env";
import { startFixtureBackend } from "../../bff/src/test/fixture-backend";
import { assertIdentityServiceUp, identityUrl } from "../../bff/src/test/identity-env";

// Starts one JWT-verifying fixture backend per app the specs call and
// registers them in the running BFF's app_backends table. Returns the
// teardown Playwright runs after the suite.
export default async function globalSetup() {
  await assertIdentityServiceUp();
  const backends = await Promise.all(
    ["recipes", "recipes-iframe"].map(async (appId) => ({
      appId,
      server: await startFixtureBackend(identityUrl(), appId),
    })),
  );
  const bffDb = new Pool(loadEnv().postgres);
  for (const { appId, server } of backends) {
    await bffDb.query(
      `insert into app_backends (app_id, base_url) values ($1, $2)
       on conflict (app_id) do update set base_url = excluded.base_url`,
      [appId, server.url],
    );
  }
  await bffDb.end();

  return async () => {
    await Promise.all(backends.map(({ server }) => server.close()));
  };
}

import type { Env, Hono } from "hono";

export function registerHealthRoute<E extends Env>(
  app: Hono<E>,
  pingDatabase: () => Promise<void>,
): void {
  app.get("/health", async (c) => {
    try {
      await pingDatabase();
      return c.json({ status: "ok" });
    } catch (err) {
      console.error("[health] database ping failed", err);
      return c.json({ status: "error" }, 503);
    }
  });
}

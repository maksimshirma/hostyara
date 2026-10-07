import { BffClient } from "../bffClient";
import { createSdkApi } from "../createSdkApi";

function setup(hid: string | null = "h1") {
  const request = jest.fn().mockResolvedValue({ ok: true });
  const bff: BffClient = { request };
  return { api: createSdkApi(bff, "recipes", () => hid), request };
}

describe("createSdkApi", () => {
  it("routes to the app's own backend in the current household", async () => {
    const { api, request } = setup();

    await expect(
      api.request("recipes", "/items/1", { method: "PUT", body: { a: 1 } }),
    ).resolves.toEqual({ ok: true });
    expect(request).toHaveBeenCalledWith("/api/h/h1/apps/recipes/items/1", {
      method: "PUT",
      body: { a: 1 },
    });
  });

  it("refuses another app's backend without sending anything", async () => {
    const { api, request } = setup();

    await expect(api.request("budget", "/items")).rejects.toMatchObject({
      code: "forbidden",
      status: 0,
    });
    expect(request).not.toHaveBeenCalled();
  });

  it("refuses relative paths and calls outside a household", async () => {
    await expect(setup().api.request("recipes", "items")).rejects.toMatchObject({
      code: "bad_request",
    });
    await expect(setup(null).api.request("recipes", "/items")).rejects.toMatchObject({
      code: "forbidden",
    });
  });
});

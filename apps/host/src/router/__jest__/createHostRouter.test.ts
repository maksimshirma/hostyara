import { createHostRouter } from "../createHostRouter";
import { HouseholdLookup } from "../loadHouseholds";

const households: HouseholdLookup = {
  resolve: (hid) => (hid === "f3k2xp" ? { hid: "f3k2xp", name: "Семья Ивановых" } : undefined),
};

function setLocation(pathname: string): void {
  window.history.replaceState(null, "", pathname);
}

describe("createHostRouter", () => {
  afterEach(() => {
    setLocation("/");
  });

  it("redirects a stale hid tail to the canonical form on attach", () => {
    setLocation("/h/f3k2xp-nasha-kvartira/a/recipes");
    const router = createHostRouter(households);
    const detach = router.attach();

    expect(window.location.pathname).toBe("/h/f3k2xp-semya-ivanovyh/a/recipes");
    detach();
  });

  it("does not touch the URL when it is already canonical", () => {
    setLocation("/h/f3k2xp-semya-ivanovyh/a/recipes");
    const replaceSpy = jest.spyOn(window.history, "replaceState");
    const router = createHostRouter(households);
    const detach = router.attach();

    expect(replaceSpy).not.toHaveBeenCalled();
    replaceSpy.mockRestore();
    detach();
  });

  it("falls back to the bare hid when the household is unknown", () => {
    setLocation("/h/unknown-old-name/a/recipes");
    const router = createHostRouter(households);
    const detach = router.attach();

    expect(window.location.pathname).toBe("/h/unknown/a/recipes");
    detach();
  });

  it("getRoute reflects the current, already-canonicalized location", () => {
    setLocation("/h/f3k2xp/a/recipes");
    const router = createHostRouter(households);
    const detach = router.attach();

    expect(router.getRoute()).toMatchObject({
      hid: "f3k2xp",
      area: { kind: "app", appId: "recipes" },
    });
    detach();
  });

  it("navigate pushes a new history entry and notifies subscribers", () => {
    // Already-canonical target: nothing left for the redirect to rewrite,
    // so the pushed URL and the resulting location match exactly.
    setLocation("/h/f3k2xp-semya-ivanovyh");
    const router = createHostRouter(households);
    const detach = router.attach();
    const pushSpy = jest.spyOn(window.history, "pushState");
    const listener = jest.fn();
    router.subscribe(listener);

    router.navigate("/h/f3k2xp-semya-ivanovyh/a/budget");

    expect(pushSpy).toHaveBeenCalledWith(null, "", "/h/f3k2xp-semya-ivanovyh/a/budget");
    expect(window.location.pathname).toBe("/h/f3k2xp-semya-ivanovyh/a/budget");
    expect(listener).toHaveBeenCalledTimes(1);
    pushSpy.mockRestore();
    detach();
  });

  it("navigate with replace uses replaceState instead of pushState", () => {
    setLocation("/h/f3k2xp-semya-ivanovyh");
    const router = createHostRouter(households);
    const detach = router.attach();
    const pushSpy = jest.spyOn(window.history, "pushState");

    router.navigate("/h/f3k2xp-semya-ivanovyh/a/budget", { replace: true });

    expect(pushSpy).not.toHaveBeenCalled();
    expect(window.location.pathname).toBe("/h/f3k2xp-semya-ivanovyh/a/budget");
    pushSpy.mockRestore();
    detach();
  });

  it("re-canonicalizes the hid tail after navigating to a stale one", () => {
    setLocation("/h/f3k2xp");
    const router = createHostRouter(households);
    const detach = router.attach();

    router.navigate("/h/f3k2xp-nasha-kvartira/a/budget");

    expect(window.location.pathname).toBe("/h/f3k2xp-semya-ivanovyh/a/budget");
    detach();
  });

  it("re-applies the canonical redirect and notifies on popstate", () => {
    setLocation("/h/f3k2xp");
    const router = createHostRouter(households);
    const detach = router.attach();
    const listener = jest.fn();
    router.subscribe(listener);

    setLocation("/h/f3k2xp-nasha-kvartira/a/recipes");
    window.dispatchEvent(new PopStateEvent("popstate"));

    expect(window.location.pathname).toBe("/h/f3k2xp-semya-ivanovyh/a/recipes");
    expect(listener).toHaveBeenCalledTimes(1);
    detach();
  });

  it("stops notifying and removes its popstate listener after detach", () => {
    setLocation("/h/f3k2xp");
    const router = createHostRouter(households);
    const detach = router.attach();
    const listener = jest.fn();
    router.subscribe(listener);

    detach();
    setLocation("/h/f3k2xp/a/budget");
    window.dispatchEvent(new PopStateEvent("popstate"));

    expect(listener).not.toHaveBeenCalled();
  });

  it("attach can be called again after detach without duplicating listeners", () => {
    setLocation("/h/f3k2xp");
    const router = createHostRouter(households);
    const detach1 = router.attach();
    detach1();

    const detach2 = router.attach();
    const listener = jest.fn();
    router.subscribe(listener);

    window.dispatchEvent(new PopStateEvent("popstate"));

    expect(listener).toHaveBeenCalledTimes(1);
    detach2();
  });
});

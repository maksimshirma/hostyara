import { createAppNavStore } from "../appNavStore";

describe("createAppNavStore", () => {
  it("accepts breadcrumbs and title only from the active app", () => {
    const store = createAppNavStore();
    store.activate("recipes");

    store.setBreadcrumbs("budget", [{ label: "Чужое" }]);
    store.setBreadcrumbs("recipes", [{ label: "Паста", href: "/r/1" }]);
    store.setTitle("budget", "Чужое");
    store.setTitle("recipes", "Паста");

    expect(store.getSnapshot()).toEqual({
      appId: "recipes",
      trail: [{ label: "Паста", href: "/r/1" }],
      title: "Паста",
    });
  });

  it("starts each mount with an empty trail", () => {
    const store = createAppNavStore();
    store.activate("recipes");
    store.setBreadcrumbs("recipes", [{ label: "Паста" }]);

    store.activate("budget");

    expect(store.getSnapshot()).toEqual({ appId: "budget", trail: [], title: null });
  });

  it("ignores everything after deactivation and notifies subscribers of changes", () => {
    const store = createAppNavStore();
    const listener = jest.fn();
    store.subscribe(listener);
    store.activate("recipes");
    store.deactivate();
    store.setBreadcrumbs("recipes", [{ label: "Поздно" }]);

    expect(store.getSnapshot()).toEqual({ appId: null, trail: [], title: null });
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("does not keep a reference to the caller's crumb objects", () => {
    const store = createAppNavStore();
    store.activate("recipes");
    const trail = [{ label: "Паста" }];
    store.setBreadcrumbs("recipes", trail);
    trail[0].label = "Изменено";

    expect(store.getSnapshot().trail[0].label).toBe("Паста");
  });
});

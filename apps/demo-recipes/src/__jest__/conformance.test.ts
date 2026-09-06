import { runConformanceSuite } from "@hostyara/conformance";

runConformanceSuite({
  appId: "recipes",
  loadAppModule: () => import("../index").then((module) => module.default),
  expectReactedToLocationChange: (el) => {
    // Neither route defines a catch-all, so an unmatched path renders
    // nothing — a real, app-specific signal that it re-rendered off the
    // pushed location rather than just not crashing. Runs inside
    // runConformanceSuite's own it() block, not standalone.
    // eslint-disable-next-line jest/no-standalone-expect
    expect(el.textContent).not.toContain("Рецепты");
  },
});

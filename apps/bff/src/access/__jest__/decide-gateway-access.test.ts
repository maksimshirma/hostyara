/** @jest-environment node */
import type { HouseholdIntrospection } from "../../identity/types";
import { decideGatewayAccess } from "../decide-gateway-access";

const BASE: HouseholdIntrospection = {
  userId: "u_1",
  hid: "h1",
  role: "member",
  installedApps: ["recipes", "budget"],
  grants: { recipes: "view" },
  permissions: {},
};

describe("decideGatewayAccess", () => {
  it("allows an installed app with a view or edit grant", () => {
    expect(decideGatewayAccess(BASE, "recipes")).toBe("allow");
    expect(decideGatewayAccess({ ...BASE, grants: { recipes: "edit" } }, "recipes")).toBe("allow");
  });

  it("asks for access when the app is installed but not granted", () => {
    expect(decideGatewayAccess(BASE, "budget")).toBe("no_grant");
  });

  it("reports not_installed before looking at grants", () => {
    expect(decideGatewayAccess({ ...BASE, grants: { tasks: "edit" } }, "tasks")).toBe(
      "not_installed",
    );
  });

  it("is not fooled by inherited object keys", () => {
    expect(decideGatewayAccess({ ...BASE, installedApps: ["toString"] }, "toString")).toBe(
      "no_grant",
    );
  });
});

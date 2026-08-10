import { MicrofrontendProps } from "@hostyara/contract";
import { createLifecycle } from "./index";

describe("@hostyara/lifecycle", () => {
  const props: MicrofrontendProps = {
    hostContext: { userId: "u1", permissions: [] },
    container: document.createElement("div"),
  };

  it("defaults unimplemented methods to no-ops", async () => {
    const lifecycle = createLifecycle({});
    await expect(lifecycle.mount(props)).resolves.toBeUndefined();
  });

  it("allows overriding individual lifecycle methods", async () => {
    const mount = jest.fn(async () => {});
    const lifecycle = createLifecycle({ mount });

    await lifecycle.mount(props);
    expect(mount).toHaveBeenCalledWith(props);
  });
});

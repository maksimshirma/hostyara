import { StrictMode } from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const initMock = jest.fn();
const registerRemotesMock = jest.fn();
const loadRemoteMock = jest.fn();

jest.mock("@module-federation/runtime", () => ({
  init: (...args: unknown[]) => initMock(...args),
  registerRemotes: (...args: unknown[]) => registerRemotesMock(...args),
  loadRemote: (...args: unknown[]) => loadRemoteMock(...args),
}));

import { HostSDK } from "@hostyara/contracts";
import { HostChrome } from "../HostChrome";
import { createFakeShellServices, FULL_ACCESS } from "../../testing/fixtures";

const fakeAppModule = { mount: jest.fn(), unmount: jest.fn() };

beforeEach(() => {
  jest.clearAllMocks();
  jest.useRealTimers();
  window.history.replaceState(null, "", "/");
  global.fetch = jest.fn(() =>
    Promise.resolve({ text: () => Promise.resolve("") }),
  ) as unknown as typeof fetch;
  // jsdom doesn't implement scrollTo; the host's scroll-restoration timer
  // (scheduled on every popstate) would otherwise log a "not implemented"
  // error on every test that simulates one.
  jest.spyOn(window, "scrollTo").mockImplementation(() => {});
});

describe("HostChrome", () => {
  it("renders the dock and slot before any remote loads", () => {
    render(<HostChrome {...createFakeShellServices()} />);

    expect(screen.getByRole("link", { name: "Рецепты" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Бюджет" })).toBeInTheDocument();
    expect(loadRemoteMock).not.toHaveBeenCalled();
  });

  it("redirects a bare / to the default household's home", () => {
    render(<HostChrome {...createFakeShellServices()} />);

    expect(window.location.pathname).toBe("/h/demo-semya-ivanovyh");
  });

  it("loads and mounts an app when its dock link is clicked, without a page reload", async () => {
    loadRemoteMock.mockResolvedValue(fakeAppModule);
    render(<HostChrome {...createFakeShellServices()} />);

    await userEvent.click(screen.getByRole("link", { name: "Рецепты" }));

    await waitFor(() => expect(fakeAppModule.mount).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("link", { name: "Рецепты" })).toHaveAttribute("aria-current", "page");
    expect(window.location.pathname).toBe("/h/demo-semya-ivanovyh/a/recipes");
  });

  it("hands the mounted app a BFF-backed api and live access for the open household", async () => {
    window.history.replaceState(null, "", "/h/demo-semya-ivanovyh/a/recipes");
    loadRemoteMock.mockResolvedValue(fakeAppModule);
    const services = createFakeShellServices({
      role: "member",
      installedApps: ["recipes", "budget"],
      grants: { recipes: "view" },
      permissions: { recipes: ["storage.own"] },
    });
    render(<HostChrome {...services} />);

    await waitFor(() => expect(fakeAppModule.mount).toHaveBeenCalledTimes(1));
    const sdk = fakeAppModule.mount.mock.calls[0][1] as HostSDK;
    await waitFor(() => expect(sdk.access.can("storage.own")).toBe(true));
    expect(sdk.access.level).toBe("view");
    expect(sdk.access.can("edit")).toBe(false);

    await sdk.api.request("recipes", "/items", { query: { q: "soup" } });
    expect(services.bff.request).toHaveBeenCalledWith("/api/h/demo/apps/recipes/items", {
      query: { q: "soup" },
    });
    await expect(sdk.api.request("budget", "/items")).rejects.toMatchObject({ code: "forbidden" });
  });

  it("mounts the app directly from a cold-started deep link, without clicking the dock", async () => {
    window.history.replaceState(null, "", "/h/demo-semya-ivanovyh/a/budget");
    loadRemoteMock.mockResolvedValue(fakeAppModule);
    render(<HostChrome {...createFakeShellServices()} />);

    await waitFor(() => expect(fakeAppModule.mount).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.getByRole("link", { name: "Бюджет" })).toHaveAttribute("aria-current", "page"),
    );
  });

  it("mounts exactly once under StrictMode's double-invoked effects", async () => {
    window.history.replaceState(null, "", "/h/demo-semya-ivanovyh/a/budget");
    loadRemoteMock.mockResolvedValue(fakeAppModule);
    render(
      <StrictMode>
        <HostChrome {...createFakeShellServices()} />
      </StrictMode>,
    );

    await waitFor(() => expect(fakeAppModule.mount).toHaveBeenCalled());
    // Give any superseded concurrent mount a chance to also land before
    // asserting there's only one.
    await waitFor(() => expect(document.querySelectorAll("[data-app]").length).toBe(1));
  });

  it("canonicalizes a stale hid tail on cold start", () => {
    window.history.replaceState(null, "", "/h/demo-nasha-kvartira/a/recipes");
    render(<HostChrome {...createFakeShellServices()} />);

    expect(window.location.pathname).toBe("/h/demo-semya-ivanovyh/a/recipes");
  });

  it("shows a not-installed state for a deep link to an unregistered appId, without touching the loader", async () => {
    window.history.replaceState(null, "", "/h/demo-semya-ivanovyh/a/does-not-exist");
    render(<HostChrome {...createFakeShellServices()} />);

    expect(
      await screen.findByText("Приложение «does-not-exist» не подключено"),
    ).toBeInTheDocument();
    expect(loadRemoteMock).not.toHaveBeenCalled();
    // The dock itself must still render — an unknown appId in the URL is
    // a slot-level error, not a reason to take down the whole chrome.
    expect(screen.getByRole("link", { name: "Рецепты" })).toBeInTheDocument();
  });

  it("shows a timeout state in the slot without crashing the chrome", async () => {
    jest.useFakeTimers();
    loadRemoteMock.mockReturnValue(new Promise(() => {}));
    render(<HostChrome {...createFakeShellServices()} />);

    await userEvent
      .setup({ advanceTimers: jest.advanceTimersByTime })
      .click(screen.getByRole("link", { name: "Рецепты" }));
    await jest.advanceTimersByTimeAsync(10000);

    expect(await screen.findByText(/не отвечает/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Рецепты" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Бюджет" })).toBeInTheDocument();
  });

  it("delivers a hid change to the mounted app via context/basename, without remounting (T15)", async () => {
    loadRemoteMock.mockResolvedValue(fakeAppModule);
    render(<HostChrome {...createFakeShellServices()} />);

    await userEvent.click(screen.getByRole("link", { name: "Рецепты" }));
    await waitFor(() => expect(fakeAppModule.mount).toHaveBeenCalledTimes(1));

    const sdk = fakeAppModule.mount.mock.calls[0][1];
    expect(sdk.context.hid).toBe("demo");
    expect(sdk.basename).toBe("/h/demo-semya-ivanovyh/a/recipes");

    // Simulates the browser's own "Back"/"Forward" (a real one never goes
    // through history.pushState) — the dev history guard can't tell that
    // apart from a genuine second writer, so it warns here as expected.
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    act(() => {
      window.history.pushState(null, "", "/h/otherhid/a/recipes");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    warnSpy.mockRestore();

    await waitFor(() => expect(sdk.context.hid).toBe("otherhid"));
    expect(sdk.basename).toBe("/h/otherhid/a/recipes");
    expect(fakeAppModule.mount).toHaveBeenCalledTimes(1);
    expect(fakeAppModule.unmount).not.toHaveBeenCalled();
  });

  it("remounts when switching away to another app and back, even to a previously-open one", async () => {
    loadRemoteMock.mockResolvedValue(fakeAppModule);
    render(<HostChrome {...createFakeShellServices()} />);

    await userEvent.click(screen.getByRole("link", { name: "Рецепты" }));
    await waitFor(() => expect(fakeAppModule.mount).toHaveBeenCalledTimes(1));

    await userEvent.click(screen.getByRole("link", { name: "Бюджет" }));
    await waitFor(() => expect(fakeAppModule.mount).toHaveBeenCalledTimes(2));

    await userEvent.click(screen.getByRole("link", { name: "Рецепты" }));
    await waitFor(() => expect(fakeAppModule.mount).toHaveBeenCalledTimes(3));
    expect(fakeAppModule.unmount).toHaveBeenCalledTimes(2);
  });

  it("shows a load-failed state and recovers via the retry button", async () => {
    loadRemoteMock.mockRejectedValueOnce(new Error("network down"));
    loadRemoteMock.mockResolvedValueOnce(fakeAppModule);
    render(<HostChrome {...createFakeShellServices()} />);

    await userEvent.click(screen.getByRole("link", { name: "Рецепты" }));
    expect(await screen.findByText(/network down/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Повторить" }));
    await waitFor(() => expect(fakeAppModule.mount).toHaveBeenCalledTimes(1));
  });

  describe("access", () => {
    const NO_GRANT = {
      role: "member",
      installedApps: ["recipes", "budget"],
      grants: { budget: "edit" as const },
      permissions: {},
    };

    function shellProps(props: ReturnType<typeof createFakeShellServices>) {
      const { changeAccess: _changeAccess, ...rest } = props;
      return rest;
    }

    it("does not load an app without a grant and offers to request access", async () => {
      window.history.replaceState(null, "", "/h/demo-semya-ivanovyh/a/recipes");
      const services = createFakeShellServices(NO_GRANT);
      render(<HostChrome {...shellProps(services)} />);

      expect(await screen.findByText("У вас нет доступа к «Рецепты»")).toBeInTheDocument();
      expect(loadRemoteMock).not.toHaveBeenCalled();

      await userEvent.click(screen.getByRole("button", { name: "Запросить просмотр" }));

      expect(services.bff.request).toHaveBeenCalledWith("/identity/grant-requests", {
        method: "POST",
        body: { hid: "demo", appId: "recipes", requestedLevel: "view" },
      });
      expect(await screen.findByText(/Запрос доступа к «Рецепты» отправлен/)).toBeInTheDocument();
      expect(window.location.pathname).toBe("/h/demo-semya-ivanovyh/a/recipes");
    });

    it("hides apps that are not installed and refuses to open them", async () => {
      window.history.replaceState(null, "", "/h/demo-semya-ivanovyh/a/budget");
      render(
        <HostChrome
          {...shellProps(
            createFakeShellServices({
              role: "owner",
              installedApps: ["recipes"],
              grants: { recipes: "edit" },
              permissions: {},
            }),
          )}
        />,
      );

      expect(await screen.findByText("Приложение «Бюджет» не подключено")).toBeInTheDocument();
      expect(screen.queryByRole("link", { name: "Бюджет" })).not.toBeInTheDocument();
      expect(loadRemoteMock).not.toHaveBeenCalled();
    });

    it("unloads an open app when its grant is revoked and brings it back once granted", async () => {
      window.history.replaceState(null, "", "/h/demo-semya-ivanovyh/a/recipes");
      loadRemoteMock.mockResolvedValue(fakeAppModule);
      const services = createFakeShellServices();
      render(<HostChrome {...shellProps(services)} />);
      await waitFor(() => expect(fakeAppModule.mount).toHaveBeenCalledTimes(1));

      await act(() => services.changeAccess(NO_GRANT));

      await waitFor(() => expect(fakeAppModule.unmount).toHaveBeenCalledTimes(1));
      expect(await screen.findByText("У вас нет доступа к «Рецепты»")).toBeInTheDocument();
      expect(window.location.pathname).toBe("/h/demo-semya-ivanovyh/a/recipes");

      await act(() => services.changeAccess(FULL_ACCESS));

      await waitFor(() => expect(fakeAppModule.mount).toHaveBeenCalledTimes(2));
    });

    it("shows the signed-in person and logs out", async () => {
      const services = createFakeShellServices();
      render(<HostChrome {...shellProps(services)} />);

      expect(screen.getByText("Демо")).toBeInTheDocument();
      await userEvent.click(screen.getByRole("button", { name: "Выйти" }));

      expect(services.onLogout).toHaveBeenCalled();
    });
  });
});

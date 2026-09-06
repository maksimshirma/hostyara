import { StrictMode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const initMock = jest.fn();
const registerRemotesMock = jest.fn();
const loadRemoteMock = jest.fn();

jest.mock("@module-federation/runtime", () => ({
  init: (...args: unknown[]) => initMock(...args),
  registerRemotes: (...args: unknown[]) => registerRemotesMock(...args),
  loadRemote: (...args: unknown[]) => loadRemoteMock(...args),
}));

import { HostChrome } from "../HostChrome";

const fakeAppModule = { mount: jest.fn(), unmount: jest.fn() };

beforeEach(() => {
  jest.clearAllMocks();
  jest.useRealTimers();
  window.history.replaceState(null, "", "/");
  global.fetch = jest.fn(() =>
    Promise.resolve({ text: () => Promise.resolve("") }),
  ) as unknown as typeof fetch;
});

describe("HostChrome", () => {
  it("renders the dock and slot before any remote loads", () => {
    render(<HostChrome />);

    expect(screen.getByRole("link", { name: "Рецепты" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Бюджет" })).toBeInTheDocument();
    expect(loadRemoteMock).not.toHaveBeenCalled();
  });

  it("redirects a bare / to the default household's home", () => {
    render(<HostChrome />);

    expect(window.location.pathname).toBe("/h/demo-semya-ivanovyh");
  });

  it("loads and mounts an app when its dock link is clicked, without a page reload", async () => {
    loadRemoteMock.mockResolvedValue(fakeAppModule);
    render(<HostChrome />);

    await userEvent.click(screen.getByRole("link", { name: "Рецепты" }));

    await waitFor(() => expect(fakeAppModule.mount).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("link", { name: "Рецепты" })).toHaveAttribute("aria-current", "page");
    expect(window.location.pathname).toBe("/h/demo-semya-ivanovyh/a/recipes");
  });

  it("mounts the app directly from a cold-started deep link, without clicking the dock", async () => {
    window.history.replaceState(null, "", "/h/demo-semya-ivanovyh/a/budget");
    loadRemoteMock.mockResolvedValue(fakeAppModule);
    render(<HostChrome />);

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
        <HostChrome />
      </StrictMode>,
    );

    await waitFor(() => expect(fakeAppModule.mount).toHaveBeenCalled());
    // Give any superseded concurrent mount a chance to also land before
    // asserting there's only one.
    await waitFor(() => expect(document.querySelectorAll("[data-app]").length).toBe(1));
  });

  it("canonicalizes a stale hid tail on cold start", () => {
    window.history.replaceState(null, "", "/h/demo-nasha-kvartira/a/recipes");
    render(<HostChrome />);

    expect(window.location.pathname).toBe("/h/demo-semya-ivanovyh/a/recipes");
  });

  it("shows a timeout state in the slot without crashing the chrome", async () => {
    jest.useFakeTimers();
    loadRemoteMock.mockReturnValue(new Promise(() => {}));
    render(<HostChrome />);

    await userEvent
      .setup({ advanceTimers: jest.advanceTimersByTime })
      .click(screen.getByRole("link", { name: "Рецепты" }));
    await jest.advanceTimersByTimeAsync(10000);

    expect(await screen.findByText(/не отвечает/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Рецепты" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Бюджет" })).toBeInTheDocument();
  });

  it("shows a load-failed state and recovers via the retry button", async () => {
    loadRemoteMock.mockRejectedValueOnce(new Error("network down"));
    loadRemoteMock.mockResolvedValueOnce(fakeAppModule);
    render(<HostChrome />);

    await userEvent.click(screen.getByRole("link", { name: "Рецепты" }));
    expect(await screen.findByText(/network down/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Повторить" }));
    await waitFor(() => expect(fakeAppModule.mount).toHaveBeenCalledTimes(1));
  });
});

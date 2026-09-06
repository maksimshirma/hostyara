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

  it("loads and mounts an app when its dock link is clicked, without a page reload", async () => {
    loadRemoteMock.mockResolvedValue(fakeAppModule);
    render(<HostChrome />);

    await userEvent.click(screen.getByRole("link", { name: "Рецепты" }));

    await waitFor(() => expect(fakeAppModule.mount).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("link", { name: "Рецепты" })).toHaveAttribute("aria-current", "page");
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

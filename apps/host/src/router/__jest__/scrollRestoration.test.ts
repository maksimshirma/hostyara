import { createScrollRestoration, readScrollKey } from "../scrollRestoration";

function setState(state: unknown): void {
  window.history.replaceState(state, "", window.location.pathname);
}

describe("scrollRestoration", () => {
  afterEach(() => {
    setState(null);
  });

  it("readScrollKey returns null when the entry has no key", () => {
    setState(null);
    expect(readScrollKey()).toBeNull();
  });

  it("readScrollKey returns the key from a tagged state", () => {
    const scroll = createScrollRestoration();
    setState(scroll.keyForNewEntry());
    expect(readScrollKey()).toBe("0");
  });

  it("keyForNewEntry allocates a fresh, increasing key every call", () => {
    const scroll = createScrollRestoration();
    expect(scroll.keyForNewEntry()).toEqual({ hostyaraScrollKey: "0" });
    expect(scroll.keyForNewEntry()).toEqual({ hostyaraScrollKey: "1" });
  });

  it("keyForReplacedEntry keeps the current key instead of allocating a new one", () => {
    const scroll = createScrollRestoration();
    setState(scroll.keyForNewEntry());

    expect(scroll.keyForReplacedEntry()).toEqual({ hostyaraScrollKey: "0" });
  });

  it("keyForReplacedEntry allocates a key when the current entry has none yet", () => {
    const scroll = createScrollRestoration();
    setState(null);

    expect(scroll.keyForReplacedEntry()).toEqual({ hostyaraScrollKey: "0" });
  });

  it("ensureCurrentEntryHasKey keeps an existing key untouched", () => {
    const scroll = createScrollRestoration();
    setState({ hostyaraScrollKey: "42" });

    expect(scroll.ensureCurrentEntryHasKey()).toEqual({ hostyaraScrollKey: "42" });
  });

  it("saveCurrentPosition is a no-op when the current entry has no key", () => {
    const scroll = createScrollRestoration();
    setState(null);
    Object.defineProperty(window, "scrollY", { value: 500, configurable: true });

    expect(() => scroll.saveCurrentPosition()).not.toThrow();
  });

  it("restores 0 for an entry that never had a position saved", () => {
    jest.useFakeTimers();
    const scroll = createScrollRestoration();
    setState(scroll.keyForNewEntry());
    const scrollToSpy = jest.spyOn(window, "scrollTo").mockImplementation(() => {});

    scroll.restoreCurrentPosition();
    jest.runAllTimers();

    expect(scrollToSpy).toHaveBeenCalledWith(0, 0);
    scrollToSpy.mockRestore();
    jest.useRealTimers();
  });

  it("round-trips a saved position through save then restore", () => {
    jest.useFakeTimers();
    const scroll = createScrollRestoration();
    setState(scroll.keyForNewEntry());
    Object.defineProperty(window, "scrollY", { value: 777, configurable: true });
    scroll.saveCurrentPosition();
    const scrollToSpy = jest.spyOn(window, "scrollTo").mockImplementation(() => {});

    scroll.restoreCurrentPosition();
    jest.runAllTimers();

    expect(scrollToSpy).toHaveBeenCalledWith(0, 777);
    scrollToSpy.mockRestore();
    jest.useRealTimers();
  });
});

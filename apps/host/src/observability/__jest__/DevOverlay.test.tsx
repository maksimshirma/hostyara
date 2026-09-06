import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DevOverlay } from "../DevOverlay";
import { createObservability } from "../createObservability";

describe("DevOverlay", () => {
  it("renders collapsed by default with a summary count in the toggle", () => {
    const observability = createObservability({ reportMetric: () => {}, reportError: () => {} });
    observability.reportMetric({ kind: "resolve", appId: "recipes", durationMs: 1 });

    render(<DevOverlay observability={observability} />);

    expect(screen.getByRole("button", { name: /1 metrics, 0 errors/ })).toBeInTheDocument();
    expect(screen.queryByText("Crashes by app")).not.toBeInTheDocument();
  });

  it("expands to show crash counts and recent metrics on click", async () => {
    const observability = createObservability({ reportMetric: () => {}, reportError: () => {} });
    observability.reportMetric({ kind: "load", appId: "recipes", durationMs: 12.3 });
    observability.reportError({
      appId: "recipes",
      remoteVersion: "1.0.0",
      source: "mount-failed",
      message: "boom",
    });

    render(<DevOverlay observability={observability} />);
    await userEvent.click(screen.getByRole("button"));

    expect(screen.getByText("recipes: 1")).toBeInTheDocument();
    expect(screen.getByText(/load · recipes · 12.3ms/)).toBeInTheDocument();
  });

  it("updates live when a new metric arrives after mount", async () => {
    const observability = createObservability({ reportMetric: () => {}, reportError: () => {} });
    render(<DevOverlay observability={observability} />);
    await userEvent.click(screen.getByRole("button"));

    expect(screen.getByText("None yet")).toBeInTheDocument();

    observability.reportMetric({ kind: "mount", appId: "budget", durationMs: 5 });

    expect(await screen.findByText(/mount · budget · 5.0ms/)).toBeInTheDocument();
  });

  it("shows a placeholder when there are no crashes yet", async () => {
    const observability = createObservability({ reportMetric: () => {}, reportError: () => {} });

    render(<DevOverlay observability={observability} />);
    await userEvent.click(screen.getByRole("button"));

    expect(screen.getByText("None this session")).toBeInTheDocument();
  });
});

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppManifest } from "@hostyara/contracts";
import { AppDock } from "../AppDock";

function manifest(id: string, name: string): AppManifest {
  return {
    id,
    name,
    version: "1.0.0",
    contract: "1",
    category: "Test",
    tags: [],
    surfaces: {},
    permissions: [],
    entities: [],
    routes: ["/"],
    mount: {
      remoteEntry: `https://cdn.example.com/${id}/remoteEntry.js`,
      exposed: "./app",
      styles: [],
    },
    network: { connect: [] },
  };
}

describe("AppDock", () => {
  const apps = [manifest("recipes", "Рецепты"), manifest("budget", "Бюджет")];

  it("renders a real link per app with a canonical href", () => {
    render(<AppDock apps={apps} activeAppId={null} hidSegment="f3k2xp" onSelect={() => {}} />);

    const link = screen.getByRole("link", { name: "Рецепты" });
    expect(link).toHaveAttribute("href", "/h/f3k2xp/a/recipes");
  });

  it("marks the active app via aria-current", () => {
    render(<AppDock apps={apps} activeAppId="budget" hidSegment="f3k2xp" onSelect={() => {}} />);

    expect(screen.getByRole("link", { name: "Бюджет" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Рецепты" })).not.toHaveAttribute("aria-current");
  });

  it("intercepts the click instead of navigating and calls onSelect with the appId", async () => {
    const onSelect = jest.fn();
    render(<AppDock apps={apps} activeAppId={null} hidSegment="f3k2xp" onSelect={onSelect} />);

    await userEvent.click(screen.getByRole("link", { name: "Рецепты" }));

    expect(onSelect).toHaveBeenCalledWith("recipes");
    expect(window.location.pathname).not.toBe("/h/f3k2xp/a/recipes");
  });
});

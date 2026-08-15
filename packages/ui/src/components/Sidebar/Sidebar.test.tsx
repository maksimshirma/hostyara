import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { Sidebar } from "./index";

function renderSidebar(props: Partial<ComponentProps<typeof Sidebar>> = {}) {
  return render(
    <Sidebar {...props}>
      <Sidebar.Header>
        <span>Brand</span>
        <Sidebar.Trigger />
      </Sidebar.Header>
      <Sidebar.Content>
        <Sidebar.Section>
          <Sidebar.SectionLabel>Menu</Sidebar.SectionLabel>
          <Sidebar.Menu>
            <Sidebar.MenuItem>
              <Sidebar.MenuButton active>
                <svg />
                <span>Dashboard</span>
              </Sidebar.MenuButton>
            </Sidebar.MenuItem>
            <Sidebar.MenuItem>
              <Sidebar.MenuButton badge={12}>
                <svg />
                <span>Inbox</span>
              </Sidebar.MenuButton>
            </Sidebar.MenuItem>
          </Sidebar.Menu>
        </Sidebar.Section>
      </Sidebar.Content>
      <Sidebar.Footer>Footer content</Sidebar.Footer>
    </Sidebar>,
  );
}

describe("Sidebar", () => {
  it("renders composed content", () => {
    renderSidebar();

    expect(screen.getByRole("button", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Inbox 12" })).toBeInTheDocument();
    expect(screen.getByText("Footer content")).toBeInTheDocument();
  });

  it("marks the active menu item", () => {
    renderSidebar();

    expect(screen.getByRole("button", { name: "Dashboard" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("button", { name: "Inbox 12" })).not.toHaveAttribute("aria-current");
  });

  it("is expanded by default and toggles to collapsed when the trigger is clicked (uncontrolled)", async () => {
    const user = userEvent.setup();
    renderSidebar();

    const sidebar = screen.getByRole("button", { name: "Dashboard" }).closest("aside")!;
    expect(sidebar).toHaveAttribute("data-collapsed", "false");

    await user.click(screen.getByRole("button", { name: "Toggle sidebar" }));

    expect(sidebar).toHaveAttribute("data-collapsed", "true");
  });

  it("is keyboard operable", async () => {
    const user = userEvent.setup();
    const handleClick = jest.fn();
    render(
      <Sidebar>
        <Sidebar.Menu>
          <Sidebar.MenuItem>
            <Sidebar.MenuButton onClick={handleClick}>
              <svg />
              <span>Dashboard</span>
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
        </Sidebar.Menu>
      </Sidebar>,
    );

    await user.tab();
    expect(screen.getByRole("button", { name: "Dashboard" })).toHaveFocus();

    await user.keyboard("{Enter}");
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("respects a controlled collapsed state and calls onCollapsedChange instead of flipping itself", async () => {
    const user = userEvent.setup();
    const onCollapsedChange = jest.fn();
    renderSidebar({ collapsed: false, onCollapsedChange });

    const sidebar = screen.getByRole("button", { name: "Dashboard" }).closest("aside")!;
    await user.click(screen.getByRole("button", { name: "Toggle sidebar" }));

    expect(onCollapsedChange).toHaveBeenCalledWith(true);
    expect(sidebar).toHaveAttribute("data-collapsed", "false");
  });

  it("only shows a collapsed-state tooltip on hover once collapsed, portalled to the body", async () => {
    const user = userEvent.setup();
    renderSidebar();

    const dashboardButton = screen.getByRole("button", { name: "Dashboard" });
    await user.hover(dashboardButton);
    expect(screen.queryByRole("tooltip", { name: "Dashboard" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Toggle sidebar" }));
    await user.hover(dashboardButton);

    const tooltip = screen.getByRole("tooltip", { name: "Dashboard" });
    expect(tooltip).toBeInTheDocument();
    expect(tooltip.closest("aside")).toBeNull();

    await user.unhover(dashboardButton);
    expect(screen.queryByRole("tooltip", { name: "Dashboard" })).not.toBeInTheDocument();
  });

  it("throws a helpful error when a subcomponent is used outside of a Sidebar", () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

    expect(() => render(<Sidebar.Trigger />)).toThrow(
      "Sidebar compound components must be rendered within a <Sidebar>",
    );

    consoleError.mockRestore();
  });
});

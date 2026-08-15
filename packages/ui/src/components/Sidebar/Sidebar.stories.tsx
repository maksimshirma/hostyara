import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Sidebar, useSidebar } from "./index";

function GridIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="2" y="2" width="6" height="6" rx="1.5" fill="currentColor" />
      <rect x="10" y="2" width="6" height="6" rx="1.5" fill="currentColor" />
      <rect x="2" y="10" width="6" height="6" rx="1.5" fill="currentColor" />
      <rect x="10" y="10" width="6" height="6" rx="1.5" fill="currentColor" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M3 15V9M9 15V3M15 15v-6" strokeLinecap="round" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M4 2h7l3 3v11H4z" strokeLinejoin="round" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M3 5h12M7 5V3h4v2M5 5l1 10h6l1-10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function InboxIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M2 10 4 3h10l2 7v5H2z" strokeLinejoin="round" />
      <path d="M2 10h4l1.5 2h3L12 10h4" strokeLinejoin="round" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M4 8a5 5 0 0 1 10 0v3l1.5 2h-13L4 11z" strokeLinejoin="round" />
      <path d="M7.5 15.5a1.5 1.5 0 0 0 3 0" />
    </svg>
  );
}

function HelpIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <circle cx="9" cy="9" r="7" />
      <path d="M7 7a2 2 0 1 1 2.5 2c-.5.4-.5.7-.5 1.3" strokeLinecap="round" />
      <circle cx="9" cy="13" r="0.25" fill="currentColor" />
    </svg>
  );
}

function LogoMark() {
  return (
    <div
      style={{
        width: 28,
        height: 28,
        borderRadius: 8,
        background: "var(--ui-gradient-brand)",
        flexShrink: 0,
      }}
    />
  );
}

const meta = {
  title: "Components/Sidebar",
  component: Sidebar,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Sidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

// Header/Footer are plain slots — the collapsed state is read via `useSidebar()`
// so a consumer can decide what to hide, rather than the library guessing.
function HeaderBrand() {
  const { collapsed } = useSidebar();

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--ui-spacing-sm)",
        width: "100%",
        flexDirection: collapsed ? "column" : "row",
        justifyContent: collapsed ? "center" : "space-between",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--ui-spacing-sm)",
        }}
      >
        <LogoMark />
        {!collapsed && <strong>Product</strong>}
      </div>
      <Sidebar.Trigger />
    </div>
  );
}

function FooterProfile() {
  const { collapsed } = useSidebar();

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--ui-spacing-sm)",
        justifyContent: collapsed ? "center" : "flex-start",
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: "var(--ui-border-radius-full)",
          background: "var(--ui-color-gray-300)",
          flexShrink: 0,
        }}
      />
      {!collapsed && (
        <div style={{ overflow: "hidden" }}>
          <div
            style={{
              fontSize: "var(--ui-font-size-sm)",
              fontWeight: "var(--ui-font-weight-medium)",
            }}
          >
            Jordan Lee
          </div>
          <div
            style={{
              fontSize: "var(--ui-font-size-xs)",
              color: "var(--ui-color-text-secondary)",
            }}
          >
            jordan@example.com
          </div>
        </div>
      )}
    </div>
  );
}

function ExampleSidebar({ defaultCollapsed = false }: { defaultCollapsed?: boolean }) {
  const [active, setActive] = useState("dashboard");

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <Sidebar defaultCollapsed={defaultCollapsed} aria-label="Primary">
        <Sidebar.Header>
          <HeaderBrand />
        </Sidebar.Header>

        <Sidebar.Content>
          <Sidebar.Section>
            <Sidebar.Menu>
              <Sidebar.MenuItem>
                <Sidebar.MenuButton
                  active={active === "inbox"}
                  onClick={() => setActive("inbox")}
                  badge={12}
                >
                  <InboxIcon />
                  <span>Inbox</span>
                </Sidebar.MenuButton>
              </Sidebar.MenuItem>
              <Sidebar.MenuItem>
                <Sidebar.MenuButton
                  active={active === "notifications"}
                  onClick={() => setActive("notifications")}
                  badge="15+"
                >
                  <BellIcon />
                  <span>Notifications</span>
                </Sidebar.MenuButton>
              </Sidebar.MenuItem>
            </Sidebar.Menu>
          </Sidebar.Section>

          <Sidebar.Section>
            <Sidebar.SectionLabel>Menu</Sidebar.SectionLabel>
            <Sidebar.Menu>
              <Sidebar.MenuItem>
                <Sidebar.MenuButton
                  active={active === "dashboard"}
                  onClick={() => setActive("dashboard")}
                >
                  <GridIcon />
                  <span>Dashboard</span>
                </Sidebar.MenuButton>
              </Sidebar.MenuItem>
              <Sidebar.MenuItem>
                <Sidebar.MenuButton
                  active={active === "analytics"}
                  onClick={() => setActive("analytics")}
                >
                  <ChartIcon />
                  <span>Analytics</span>
                </Sidebar.MenuButton>
              </Sidebar.MenuItem>
              <Sidebar.MenuItem>
                <Sidebar.MenuButton
                  active={active === "documents"}
                  onClick={() => setActive("documents")}
                >
                  <DocumentIcon />
                  <span>Documents</span>
                </Sidebar.MenuButton>
              </Sidebar.MenuItem>
              <Sidebar.MenuItem>
                <Sidebar.MenuButton active={active === "trash"} onClick={() => setActive("trash")}>
                  <TrashIcon />
                  <span>Trash</span>
                </Sidebar.MenuButton>
              </Sidebar.MenuItem>
            </Sidebar.Menu>
          </Sidebar.Section>

          <Sidebar.Section>
            <Sidebar.Menu>
              <Sidebar.MenuItem>
                <Sidebar.MenuButton active={active === "help"} onClick={() => setActive("help")}>
                  <HelpIcon />
                  <span>Help</span>
                </Sidebar.MenuButton>
              </Sidebar.MenuItem>
            </Sidebar.Menu>
          </Sidebar.Section>
        </Sidebar.Content>

        <Sidebar.Footer>
          <FooterProfile />
        </Sidebar.Footer>
      </Sidebar>

      <div
        style={{
          flex: 1,
          padding: "var(--ui-spacing-xl)",
          color: "var(--ui-color-text)",
        }}
      >
        <h1 style={{ fontSize: "var(--ui-font-size-2xl)", margin: 0 }}>Content area</h1>
        <p style={{ color: "var(--ui-color-text-secondary)" }}>
          Use the sidebar trigger to collapse it, or hover over icons while collapsed to see
          tooltips.
        </p>
      </div>
    </div>
  );
}

export const Expanded: Story = {
  args: { children: null },
  render: () => <ExampleSidebar />,
};

export const Collapsed: Story = {
  args: { children: null },
  render: () => <ExampleSidebar defaultCollapsed />,
};

import type { Meta, StoryObj } from "@storybook/react";
import Typography from "@mui/material/Typography";
import { createHostRouter, createHouseholdLookup, parseRoute, RouterProvider } from "../../router";
import { buildShellNav } from "./shellNav";
import { ShellLayout } from "./ShellLayout";

const households = [
  { hid: "demo", name: "Семья Ивановых" },
  { hid: "dacha", name: "Дача" },
];
const router = createHostRouter(createHouseholdLookup(households));
const route = parseRoute("/h/demo-semya-ivanovyh/a/recipes");

const meta: Meta<typeof ShellLayout> = {
  title: "Host/Shell/ShellLayout",
  component: ShellLayout,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <RouterProvider router={router}>
        <Story />
      </RouterProvider>
    ),
  ],
  args: {
    nav: buildShellNav(route, "demo-semya-ivanovyh", [
      { id: "recipes", name: "Рецепты" },
      { id: "budget", name: "Бюджет" },
    ]),
    households,
    currentHid: "demo",
    user: { id: "u1", name: "Анна Иванова", email: "anna@example.com" },
    onLogout: () => {},
    children: <Typography variant="h4">Рецепты</Typography>,
  },
};

export default meta;
type Story = StoryObj<typeof ShellLayout>;

export const Desktop: Story = {};

export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: "mobile1" } },
};

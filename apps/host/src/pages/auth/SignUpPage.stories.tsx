import type { Meta, StoryObj } from "@storybook/react";
import { createHostRouter, createHouseholdLookup, RouterProvider } from "../../router";
import { SignUpPage } from "./SignUpPage";

const router = createHostRouter(createHouseholdLookup([]));

const meta: Meta<typeof SignUpPage> = {
  title: "Host/Auth/SignUpPage",
  component: SignUpPage,
  decorators: [
    (Story) => (
      <RouterProvider router={router}>
        <Story />
      </RouterProvider>
    ),
  ],
  args: {
    signInHref: "/login",
    onSignUp: async () => null,
  },
};

export default meta;
type Story = StoryObj<typeof SignUpPage>;

export const Default: Story = {};

export const AlreadyRegistered: Story = {
  args: { onSignUp: async () => "already_registered" },
};

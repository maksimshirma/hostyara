import type { Meta, StoryObj } from "@storybook/react";
import { createHostRouter, createHouseholdLookup, RouterProvider } from "../../router";
import { SignInPage } from "./SignInPage";

const router = createHostRouter(createHouseholdLookup([]));

const meta: Meta<typeof SignInPage> = {
  title: "Host/Auth/SignInPage",
  component: SignInPage,
  decorators: [
    (Story) => (
      <RouterProvider router={router}>
        <Story />
      </RouterProvider>
    ),
  ],
  args: {
    notice: null,
    signUpHref: "/signup",
    onLogin: async () => null,
  },
};

export default meta;
type Story = StoryObj<typeof SignInPage>;

export const Default: Story = {};

export const SessionExpired: Story = {
  args: { notice: "Сессия завершена — войдите снова" },
};

export const WrongPassword: Story = {
  args: { onLogin: async () => "invalid_credentials" },
};

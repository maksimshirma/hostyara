import type { Meta, StoryObj } from "@storybook/react";
import { ShellRouter } from "../../testing/ShellRouter";
import { SignInPage } from "./SignInPage";

const meta: Meta<typeof SignInPage> = {
  title: "Host/Auth/SignInPage",
  component: SignInPage,
  decorators: [
    (Story) => (
      <ShellRouter>
        <Story />
      </ShellRouter>
    ),
  ],
  args: {
    notice: null,
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

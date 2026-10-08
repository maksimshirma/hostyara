import type { Meta, StoryObj } from "@storybook/react";
import { ShellRouter } from "../../testing/ShellRouter";
import { SignUpPage } from "./SignUpPage";

const meta: Meta<typeof SignUpPage> = {
  title: "Host/Auth/SignUpPage",
  component: SignUpPage,
  decorators: [
    (Story) => (
      <ShellRouter>
        <Story />
      </ShellRouter>
    ),
  ],
  args: {
    onSignUp: async () => null,
  },
};

export default meta;
type Story = StoryObj<typeof SignUpPage>;

export const Default: Story = {};

export const AlreadyRegistered: Story = {
  args: { onSignUp: async () => "already_registered" },
};

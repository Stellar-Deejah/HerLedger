import type { Meta, StoryObj } from "@storybook/react";

import { SubmitButton } from "./submit-button";

const meta: Meta<typeof SubmitButton> = {
  title: "UI/SubmitButton",
  component: SubmitButton,
  tags: ["autodocs"],
  argTypes: {
    children: { control: "text" },
    loading: { control: "boolean" },
    disabled: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof SubmitButton>;

export const Default: Story = {
  args: {
    children: "Register Business",
    loading: false,
    disabled: false,
  },
};

export const Loading: Story = {
  args: {
    children: "Submitting transaction…",
    loading: true,
    disabled: false,
  },
};

export const Disabled: Story = {
  args: {
    children: "Action Unavailable",
    loading: false,
    disabled: true,
  },
};

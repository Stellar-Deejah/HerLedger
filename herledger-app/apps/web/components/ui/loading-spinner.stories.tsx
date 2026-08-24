import type { Meta, StoryObj } from "@storybook/react";

import { LoadingSpinner } from "./loading-spinner";

const meta: Meta<typeof LoadingSpinner> = {
  title: "UI/LoadingSpinner",
  component: LoadingSpinner,
  tags: ["autodocs"],
  argTypes: {
    label: { control: "text" },
  },
};

export default meta;
type Story = StoryObj<typeof LoadingSpinner>;

export const Default: Story = {
  args: {
    label: "Loading…",
  },
};

export const CustomLabel: Story = {
  args: {
    label: "Synchronizing ledger events from Stellar Horizon…",
  },
};

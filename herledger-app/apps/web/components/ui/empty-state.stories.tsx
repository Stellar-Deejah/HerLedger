import type { Meta, StoryObj } from "@storybook/react";

import { EmptyState } from "./empty-state";

const meta: Meta<typeof EmptyState> = {
  title: "UI/EmptyState",
  component: EmptyState,
  tags: ["autodocs"],
  argTypes: {
    title: { control: "text" },
    description: { control: "text" },
  },
};

export default meta;
type Story = StoryObj<typeof EmptyState>;

export const Default: Story = {
  args: {
    title: "No financial records found",
    description: "Connect your Stellar wallet or submit a transaction to begin recording entries.",
  },
};

export const WithoutDescription: Story = {
  args: {
    title: "No items available",
  },
};

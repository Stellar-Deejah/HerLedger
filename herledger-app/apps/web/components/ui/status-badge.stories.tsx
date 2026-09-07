import type { Meta, StoryObj } from "@storybook/react";

import { StatusBadge } from "./status-badge";

const meta: Meta<typeof StatusBadge> = {
  title: "UI/StatusBadge",
  component: StatusBadge,
  tags: ["autodocs"],
  argTypes: {
    status: {
      control: "select",
      options: ["Pending", "Verified", "Disputed", "Revoked", "Active"],
    },
  },
};

export default meta;
type Story = StoryObj<typeof StatusBadge>;

export const Pending: Story = {
  args: {
    status: "Pending",
  },
};

export const Verified: Story = {
  args: {
    status: "Verified",
  },
};

export const Disputed: Story = {
  args: {
    status: "Disputed",
  },
};

export const Revoked: Story = {
  args: {
    status: "Revoked",
  },
};

export const Active: Story = {
  args: {
    status: "Active",
  },
};

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
      <StatusBadge status="Pending" />
      <StatusBadge status="Verified" />
      <StatusBadge status="Disputed" />
      <StatusBadge status="Revoked" />
      <StatusBadge status="Active" />
    </div>
  ),
};

import type { Meta, StoryObj } from "@storybook/react";

import { SkeletonBlock, SkeletonCard, SkeletonRow, SkeletonTable } from "./skeleton";

const meta: Meta<typeof SkeletonTable> = {
  title: "UI/Skeleton",
  component: SkeletonTable,
  tags: ["autodocs"],
  args: {
    rows: 5,
    columns: 5,
  },
};

export default meta;
type Story = StoryObj<typeof SkeletonTable>;

export const Table: Story = {};

export const Row: StoryObj<typeof SkeletonRow> = {
  render: () => (
    <div style={{ padding: "0 1rem" }}>
      <SkeletonRow widths={["30%", "20%", "15%", "15%", "20%"]} />
    </div>
  ),
  args: {},
};

export const Card: StoryObj<typeof SkeletonCard> = {
  render: () => <SkeletonCard lines={4} />,
  args: {},
};

export const Block: StoryObj<typeof SkeletonBlock> = {
  render: () => (
    <div style={{ padding: "1rem" }}>
      <SkeletonBlock width="100%" height="1rem" />
    </div>
  ),
  args: {},
};

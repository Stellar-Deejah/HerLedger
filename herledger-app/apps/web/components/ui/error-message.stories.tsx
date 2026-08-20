import type { Meta, StoryObj } from "@storybook/react";

import { ErrorMessage } from "./error-message";

const meta: Meta<typeof ErrorMessage> = {
  title: "UI/ErrorMessage",
  component: ErrorMessage,
  tags: ["autodocs"],
  argTypes: {
    message: { control: "text" },
  },
};

export default meta;
type Story = StoryObj<typeof ErrorMessage>;

export const Default: Story = {
  args: {
    message: "Invalid transaction signature or missing required attestation payload.",
  },
};

export const LongMessage: Story = {
  args: {
    message:
      "Failed to reconcile Stellar ledger event sequence #1029384: contract state verification failed because the transaction hash does not match the on-chain Soroban event receipt.",
  },
};

import type { Meta, StoryObj } from "@storybook/react";
import React, { useState } from "react";

import { Field, FormField, type FormFieldProps } from "./form-field";

const meta: Meta<typeof FormField> = {
  title: "UI/FormField",
  component: FormField,
  tags: ["autodocs"],
  argTypes: {
    id: { control: "text" },
    label: { control: "text" },
    type: {
      control: "select",
      options: ["text", "email", "password", "number", "tel", "url"],
    },
    value: { control: "text" },
    required: { control: "boolean" },
    description: { control: "text" },
    error: { control: "text" },
    disabled: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof FormField>;

function ControlledFormField(args: FormFieldProps) {
  const [val, setVal] = useState(args.value || "");
  return <FormField {...args} value={val} onChange={setVal} />;
}

export const Default: Story = {
  render: (args) => <ControlledFormField {...args} />,
  args: {
    id: "business-name",
    label: "Business Name",
    type: "text",
    value: "Acme Corp",
    required: true,
  },
};

export const WithDescription: Story = {
  render: (args) => <ControlledFormField {...args} />,
  args: {
    id: "password",
    label: "Account Password",
    type: "password",
    value: "",
    required: true,
    description: "Must be at least 8 characters long with uppercase and numbers.",
  },
};

export const WithError: Story = {
  render: (args) => <ControlledFormField {...args} />,
  args: {
    id: "email",
    label: "Corporate Email Address",
    type: "email",
    value: "invalid-email-address",
    required: true,
    error: "Please enter a valid email address.",
  },
};

export const Disabled: Story = {
  render: (args) => <ControlledFormField {...args} />,
  args: {
    id: "stellar-pubkey",
    label: "Connected Stellar Account",
    type: "text",
    value: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
    disabled: true,
    description: "Wallet address is automatically synced via Freighter.",
  },
};

function ComposableCompoundExample() {
  const [amount, setAmount] = useState("100.50");
  const [currency, setCurrency] = useState("XLM");

  return (
    <Field.Root id="split-payment" required>
      <Field.Label>Payment Amount & Asset</Field.Label>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <Field.Input
          type="number"
          value={amount}
          onChange={(val: string) => setAmount(val)}
          style={{ flex: 1 }}
        />
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          style={{
            padding: "var(--spacing-sm) var(--spacing-md)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            background: "var(--background)",
            color: "var(--foreground)",
          }}
        >
          <option value="XLM">XLM</option>
          <option value="USDC">USDC</option>
          <option value="EURC">EURC</option>
        </select>
      </div>
      <Field.Hint>Specify the exact Soroban token denomination for the transaction.</Field.Hint>
    </Field.Root>
  );
}

export const ComposableCompoundPattern: Story = {
  render: () => <ComposableCompoundExample />,
};

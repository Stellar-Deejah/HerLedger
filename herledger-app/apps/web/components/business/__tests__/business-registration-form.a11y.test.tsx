// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { axe } from "vitest-axe";

// Must be imported (and vi.mock() registered) before "../business-registration-form"
// — see use-registration-flow.test.tsx for why import order matters here.
import { mockPublicEnv } from "@/tests/utils/mock-public-env";

vi.mock("@herledger/config", () => ({
  getPublicEnv: mockPublicEnv,
}));

// See business-registration-form.test.tsx for why this mirrors "reconnect
// silently on mount if already connected" rather than always showing the
// connect button.
vi.mock("@/components/wallet/wallet-connect", () => ({
  WalletConnect: ({ onConnected }: { onConnected: (addr: string) => void }) => {
    useEffect(() => {
      if (mockWalletConnectionState.connected) {
        onConnected(TEST_WALLET_ADDRESS);
      }
       
    }, []);

    if (mockWalletConnectionState.connected) {
      return <p>Connected wallet: {TEST_WALLET_ADDRESS}</p>;
    }

    return (
      <button
        type="button"
        onClick={() => {
          mockWalletConnectionState.connected = true;
          onConnected(TEST_WALLET_ADDRESS);
        }}
      >
        Connect Freighter wallet
      </button>
    );
  },
}));

import { MockSdkProvider, mockRegisterBusinessThrows } from "@/tests/utils/mock-sdk-provider";
import { TEST_WALLET_ADDRESS, mockWalletConnectionState } from "@/tests/utils/mock-wallet";
import { resetMockWalletConnectionState } from "@/tests/utils/mock-wallet";

import { BusinessRegistrationForm } from "../business-registration-form";

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }));
  resetMockWalletConnectionState();
});

// jsdom has no canvas backend, which axe-core's color-contrast check needs
// to sample rendered pixel colors — it degrades gracefully rather than
// failing tests, but logs a noisy "HTMLCanvasElement.getContext not
// implemented" error to the console on every run. This project renders
// with CSS custom properties (var(--foreground), etc.) that jsdom can't
// resolve to concrete colors anyway, so a real contrast reading isn't
// meaningful here regardless — layout/rendering-dependent rules like this
// belong in a real-browser check (e.g. Playwright + axe), not this unit
// suite. Disable it here so the structural/ARIA assertions this file is
// actually for aren't drowned out.
const AXE_OPTIONS = { rules: { "color-contrast": { enabled: false } } };

describe("BusinessRegistrationForm accessibility", () => {
  it("has no axe violations on the initial wallet step", async () => {
    const { container } = render(
      <MockSdkProvider>
        <BusinessRegistrationForm />
      </MockSdkProvider>
    );
    expect(await axe(container, AXE_OPTIONS)).toHaveNoViolations();
  });

  it("marks exactly the active step with aria-current='step'", async () => {
    const user = userEvent.setup();
    render(
      <MockSdkProvider>
        <BusinessRegistrationForm />
      </MockSdkProvider>
    );

    await user.click(screen.getByRole("button", { name: /connect freighter wallet/i }));

    const steps = screen.getAllByRole("listitem");
    const current = steps.filter((li) => li.getAttribute("aria-current") === "step");
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveTextContent("Business details");

    // The other two steps must NOT carry aria-current.
    const notCurrent = steps.filter((li) => li !== current[0]);
    for (const li of notCurrent) {
      expect(li).not.toHaveAttribute("aria-current");
    }
  });

  it("moves focus to the new step's heading on each forward transition", async () => {
    const user = userEvent.setup();
    render(
      <MockSdkProvider>
        <BusinessRegistrationForm />
      </MockSdkProvider>
    );

    await user.click(screen.getByRole("button", { name: /connect freighter wallet/i }));

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: /step 2: business details/i })).toHaveFocus()
    );
  });

  it("announces the error via role=alert and has no axe violations on the error step", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <MockSdkProvider overrides={{ registerBusiness: mockRegisterBusinessThrows("Simulated failure") }}>
        <BusinessRegistrationForm />
      </MockSdkProvider>
    );

    await user.click(screen.getByRole("button", { name: /connect freighter wallet/i }));
    await user.type(screen.getByLabelText(/business name/i), "Acme Traders");
    await user.click(screen.getByRole("button", { name: /register on stellar/i }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/simulated failure/i);

    // Focus should also land on the error step's heading, not stay on the
    // now-unmounted submit button.
    expect(screen.getByRole("heading", { name: /registration failed/i })).toHaveFocus();

    expect(await axe(container, AXE_OPTIONS)).toHaveNoViolations();
  });

  it("has no axe violations on the confirmation step", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <MockSdkProvider
        overrides={{
          registerBusiness: async () => ({ hash: "tx-a11y", success: true, ledger: 1 }),
        }}
      >
        <BusinessRegistrationForm />
      </MockSdkProvider>
    );

    await user.click(screen.getByRole("button", { name: /connect freighter wallet/i }));
    await user.type(screen.getByLabelText(/business name/i), "Acme Traders");
    await user.click(screen.getByRole("button", { name: /register on stellar/i }));

    await screen.findByRole("heading", { name: /business registered on stellar/i });
    expect(await axe(container, AXE_OPTIONS)).toHaveNoViolations();
  });
});

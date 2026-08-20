// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Must be imported (and vi.mock() registered) before "../business-registration-form"
// — that component transitively imports "@herledger/config" via
// useRegistrationFlow, and import order (not vi.mock's hoisting) determines
// which runs first. See use-registration-flow.test.tsx for the full note.
import { clearPendingRegistration } from "@/lib/business/pending-registration";
import { mockPublicEnv } from "@/tests/utils/mock-public-env";

vi.mock("@herledger/config", () => ({
  getPublicEnv: mockPublicEnv,
}));

// WalletConnect itself talks to Freighter (browser extension) via @herledger/sdk.
// The wizard test doesn't need real wallet UI — stub it, but mirror the real
// component's "reconnect silently on mount if already connected" behavior
// (see mock-wallet.ts) rather than always showing the connect button,
// since BusinessRegistrationForm remounts this on every error -> retry.
vi.mock("@/components/wallet/wallet-connect", () => ({
  WalletConnect: ({ onConnected }: { onConnected: (addr: string) => void }) => {
    useEffect(() => {
      if (mockWalletConnectionState.connected) {
        onConnected(TEST_WALLET_ADDRESS);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
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

import {
  MockSdkProvider,
  mockRegisterBusinessSuccess,
  mockRegisterBusinessThrows,
  mockRegisterBusinessWalletDisconnected,
} from "@/tests/utils/mock-sdk-provider";
import {
  TEST_WALLET_ADDRESS,
  mockWalletConnectionState,
  resetMockWalletConnectionState,
} from "@/tests/utils/mock-wallet";

import { BusinessRegistrationForm } from "../business-registration-form";

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }));
  resetMockWalletConnectionState();
  clearPendingRegistration();
});

function renderForm(overrides: Parameters<typeof MockSdkProvider>[0]["overrides"]) {
  return render(
    <MockSdkProvider overrides={overrides}>
      <BusinessRegistrationForm />
    </MockSdkProvider>
  );
}

describe("BusinessRegistrationForm", () => {
  it("renders the wallet step first, with only one step marked aria-current", () => {
    renderForm({});
    const current = screen
      .getAllByRole("listitem")
      .filter((li) => li.getAttribute("aria-current") === "step");
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveTextContent("Connect wallet");
  });

  it("advances to the business details step after wallet connect", async () => {
    const user = userEvent.setup();
    renderForm({});

    await user.click(screen.getByRole("button", { name: /connect freighter wallet/i }));

    expect(screen.getByRole("heading", { name: /step 2: business details/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/business name/i)).toBeInTheDocument();
  });

  it("completes the full flow through to confirmation using MockSdkProvider", async () => {
    const user = userEvent.setup();
    renderForm({ registerBusiness: mockRegisterBusinessSuccess("tx-e2e-1") });

    await user.click(screen.getByRole("button", { name: /connect freighter wallet/i }));
    await user.type(screen.getByLabelText(/business name/i), "Acme Traders");
    await user.click(screen.getByRole("button", { name: /register on stellar/i }));

    await waitFor(() =>
      expect(screen.getByText(/business registered on stellar/i)).toBeInTheDocument()
    );
    expect(screen.getByText(/tx-e2e-1/)).toBeInTheDocument();
  });

  it("shows an error and a Try again control when registration fails", async () => {
    const user = userEvent.setup();
    renderForm({ registerBusiness: mockRegisterBusinessThrows("Simulated failure") });

    await user.click(screen.getByRole("button", { name: /connect freighter wallet/i }));
    await user.type(screen.getByLabelText(/business name/i), "Acme Traders");
    await user.click(screen.getByRole("button", { name: /register on stellar/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/simulated failure/i);
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("Try again returns to the business details step without losing the wallet connection", async () => {
    const user = userEvent.setup();
    renderForm({ registerBusiness: mockRegisterBusinessThrows() });

    await user.click(screen.getByRole("button", { name: /connect freighter wallet/i }));
    await user.type(screen.getByLabelText(/business name/i), "Acme Traders");
    await user.click(screen.getByRole("button", { name: /register on stellar/i }));
    await screen.findByRole("button", { name: /try again/i });

    await user.click(screen.getByRole("button", { name: /try again/i }));

    expect(screen.getByRole("heading", { name: /step 2: business details/i })).toBeInTheDocument();
    // No wallet-connect button re-appears — connection was preserved.
    expect(
      screen.queryByRole("button", { name: /connect freighter wallet/i })
    ).not.toBeInTheDocument();
  });

  it("shows an inline error and a reconnect prompt when the wallet disconnects mid-flow, without crashing", async () => {
    const user = userEvent.setup();
    renderForm({ registerBusiness: mockRegisterBusinessWalletDisconnected() });

    await user.click(screen.getByRole("button", { name: /connect freighter wallet/i }));
    await user.type(screen.getByLabelText(/business name/i), "Acme Traders");
    await user.click(screen.getByRole("button", { name: /register on stellar/i }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/reconnect/i);

    // Simulate Freighter genuinely being gone now, not just this one
    // signing call having failed — mirrors a real disconnect.
    mockWalletConnectionState.connected = false;

    await user.click(screen.getByRole("button", { name: /try again/i }));

    expect(screen.getByRole("button", { name: /connect freighter wallet/i })).toBeInTheDocument();
  });
});

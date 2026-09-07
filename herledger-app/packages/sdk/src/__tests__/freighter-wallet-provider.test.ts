import { describe, it, expect, vi, beforeEach } from "vitest";
import { FreighterWalletProvider } from "../wallet/freighter.js";
import { WalletError } from "../errors/index.js";

// ---------------------------------------------------------------------------
// Mock @stellar/freighter-api
// ---------------------------------------------------------------------------
const mockIsConnected = vi.fn();
const mockRequestAccess = vi.fn();
const mockGetAddress = vi.fn();
const mockGetNetwork = vi.fn();
const mockSignTransaction = vi.fn();

vi.mock("@stellar/freighter-api", () => ({
  isConnected: () => mockIsConnected(),
  requestAccess: () => mockRequestAccess(),
  getAddress: () => mockGetAddress(),
  getNetwork: () => mockGetNetwork(),
  signTransaction: (xdr: string, opts: Record<string, unknown>) => mockSignTransaction(xdr, opts),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function provider() {
  return new FreighterWalletProvider();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("FreighterWalletProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---- isAvailable() ------------------------------------------------------

  describe("isAvailable()", () => {
    it("returns true when Freighter reports isConnected=true", async () => {
      mockIsConnected.mockResolvedValue({ isConnected: true });
      expect(await provider().isAvailable()).toBe(true);
    });

    it("returns false when Freighter reports isConnected=false", async () => {
      mockIsConnected.mockResolvedValue({ isConnected: false });
      expect(await provider().isAvailable()).toBe(false);
    });

    it("returns false when the Freighter API throws", async () => {
      mockIsConnected.mockRejectedValue(new Error("extension not installed"));
      expect(await provider().isAvailable()).toBe(false);
    });
  });

  // ---- connect() ----------------------------------------------------------

  describe("connect()", () => {
    it("returns publicKey and network on success", async () => {
      mockIsConnected.mockResolvedValue({ isConnected: true });
      mockRequestAccess.mockResolvedValue({ error: null });
      mockGetAddress.mockResolvedValue({ address: "GABCDEFG", error: null });
      mockGetNetwork.mockResolvedValue({ network: "TESTNET" });

      const result = await provider().connect();

      expect(result.publicKey).toBe("GABCDEFG");
      expect(result.network).toBe("TESTNET");
    });

    it("throws WalletError when Freighter is not available", async () => {
      mockIsConnected.mockResolvedValue({ isConnected: false });

      await expect(provider().connect()).rejects.toThrow(WalletError);
      await expect(provider().connect()).rejects.toThrow(/not installed/);
    });

    it("throws WalletError when requestAccess returns an error", async () => {
      mockIsConnected.mockResolvedValue({ isConnected: true });
      mockRequestAccess.mockResolvedValue({ error: "User rejected" });

      await expect(provider().connect()).rejects.toThrow(WalletError);
      await expect(provider().connect()).rejects.toThrow(/User rejected/);
    });

    it("throws WalletError when requestAccess throws", async () => {
      mockIsConnected.mockResolvedValue({ isConnected: true });
      mockRequestAccess.mockRejectedValue(new Error("browser error"));

      await expect(provider().connect()).rejects.toThrow(WalletError);
      await expect(provider().connect()).rejects.toThrow(/Failed to request Freighter access/);
    });

    it("throws WalletError when getAddress returns an error", async () => {
      mockIsConnected.mockResolvedValue({ isConnected: true });
      mockRequestAccess.mockResolvedValue({ error: null });
      mockGetAddress.mockResolvedValue({ address: null, error: "no address" });

      await expect(provider().connect()).rejects.toThrow(WalletError);
      await expect(provider().connect()).rejects.toThrow(/Could not retrieve wallet address/);
    });

    it("falls back to UNKNOWN network when getNetwork returns no network", async () => {
      mockIsConnected.mockResolvedValue({ isConnected: true });
      mockRequestAccess.mockResolvedValue({ error: null });
      mockGetAddress.mockResolvedValue({ address: "GABCDEFG", error: null });
      mockGetNetwork.mockResolvedValue({ network: null });

      const result = await provider().connect();
      expect(result.network).toBe("UNKNOWN");
    });
  });

  // ---- disconnect() -------------------------------------------------------

  describe("disconnect()", () => {
    it("resolves without error (Freighter has no disconnect API)", async () => {
      await expect(provider().disconnect()).resolves.toBeUndefined();
    });
  });

  // ---- getAddress() -------------------------------------------------------

  describe("getAddress()", () => {
    it("returns the connected address when available", async () => {
      mockGetAddress.mockResolvedValue({ address: "GABCDEFG", error: null });
      expect(await provider().getAddress()).toBe("GABCDEFG");
    });

    it("returns null when getAddress returns no address", async () => {
      mockGetAddress.mockResolvedValue({ address: null, error: null });
      expect(await provider().getAddress()).toBeNull();
    });

    it("returns null when getAddress returns an error", async () => {
      mockGetAddress.mockResolvedValue({ address: null, error: "no wallet" });
      expect(await provider().getAddress()).toBeNull();
    });

    it("returns null when getAddress throws", async () => {
      mockGetAddress.mockRejectedValue(new Error("API failure"));
      expect(await provider().getAddress()).toBeNull();
    });
  });

  // ---- signTransaction() --------------------------------------------------

  describe("signTransaction()", () => {
    const XDR = "AAAAAgAAAAB...";
    const PASSPHRASE = "Test SDF Network ; September 2015";

    it("returns the signed XDR on success", async () => {
      mockSignTransaction.mockResolvedValue({ signedTxXdr: "SIGNED_XDR", error: null });

      const signed = await provider().signTransaction(XDR, PASSPHRASE);
      expect(signed).toBe("SIGNED_XDR");
    });

    it("passes the accountToSign option when provided", async () => {
      mockSignTransaction.mockResolvedValue({ signedTxXdr: "SIGNED_XDR", error: null });

      await provider().signTransaction(XDR, PASSPHRASE, "GACCOUNT");

      expect(mockSignTransaction).toHaveBeenCalledWith(XDR, {
        networkPassphrase: PASSPHRASE,
        address: "GACCOUNT",
      });
    });

    it("omits the address option when accountToSign is not provided", async () => {
      mockSignTransaction.mockResolvedValue({ signedTxXdr: "SIGNED_XDR", error: null });

      await provider().signTransaction(XDR, PASSPHRASE);

      expect(mockSignTransaction).toHaveBeenCalledWith(XDR, {
        networkPassphrase: PASSPHRASE,
      });
    });

    it("throws WalletError when signTransaction returns an error", async () => {
      mockSignTransaction.mockResolvedValue({ signedTxXdr: null, error: "rejected" });

      await expect(provider().signTransaction(XDR, PASSPHRASE)).rejects.toThrow(WalletError);
      await expect(provider().signTransaction(XDR, PASSPHRASE)).rejects.toThrow(/rejected/);
    });

    it("throws WalletError when signedTxXdr is empty", async () => {
      mockSignTransaction.mockResolvedValue({ signedTxXdr: null, error: null });

      await expect(provider().signTransaction(XDR, PASSPHRASE)).rejects.toThrow(WalletError);
      await expect(provider().signTransaction(XDR, PASSPHRASE)).rejects.toThrow(
        /no signed transaction XDR/
      );
    });

    it("throws WalletError when signTransaction throws", async () => {
      mockSignTransaction.mockRejectedValue(new Error("Freighter crashed"));

      await expect(provider().signTransaction(XDR, PASSPHRASE)).rejects.toThrow(WalletError);
      await expect(provider().signTransaction(XDR, PASSPHRASE)).rejects.toThrow(
        /Failed to sign transaction/
      );
    });
  });

  // ---- WalletProvider interface conformance --------------------------------

  describe("WalletProvider interface conformance", () => {
    it("implements connect, disconnect, getAddress, signTransaction", () => {
      const p = provider();
      expect(typeof p.connect).toBe("function");
      expect(typeof p.disconnect).toBe("function");
      expect(typeof p.getAddress).toBe("function");
      expect(typeof p.signTransaction).toBe("function");
    });
  });

  // ---- Backward-compatible functional exports ------------------------------

  describe("backward-compatible functional exports", () => {
    it("isFreighterAvailable delegates to FreighterWalletProvider", async () => {
      const { isFreighterAvailable } = await import("../wallet/freighter.js");
      mockIsConnected.mockResolvedValue({ isConnected: true });
      expect(await isFreighterAvailable()).toBe(true);
    });

    it("connectWallet delegates to FreighterWalletProvider", async () => {
      const { connectWallet } = await import("../wallet/freighter.js");
      mockIsConnected.mockResolvedValue({ isConnected: true });
      mockRequestAccess.mockResolvedValue({ error: null });
      mockGetAddress.mockResolvedValue({ address: "GABCDEFG", error: null });
      mockGetNetwork.mockResolvedValue({ network: "TESTNET" });

      const { publicKey } = await connectWallet();
      expect(publicKey).toBe("GABCDEFG");
    });

    it("getConnectedAddress delegates to FreighterWalletProvider", async () => {
      const { getConnectedAddress } = await import("../wallet/freighter.js");
      mockGetAddress.mockResolvedValue({ address: "GABCDEFG", error: null });
      expect(await getConnectedAddress()).toBe("GABCDEFG");
    });

    it("signTransactionWithFreighter delegates to FreighterWalletProvider", async () => {
      const { signTransactionWithFreighter } = await import("../wallet/freighter.js");
      mockSignTransaction.mockResolvedValue({ signedTxXdr: "SIGNED_XDR", error: null });
      const result = await signTransactionWithFreighter(
        "AAAAAgAAAAB...",
        "Test SDF Network ; September 2015"
      );
      expect(result).toBe("SIGNED_XDR");
    });
  });
});

// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const push = vi.fn();
let searchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => searchParams,
}));

const sendVerificationEmailMock = vi.fn();
vi.mock("@/lib/auth/client", () => ({
  sendVerificationEmail: (...args: unknown[]) => sendVerificationEmailMock(...args),
}));

import { VerifyEmailPanel } from "../verify-email-panel";

beforeEach(() => {
  push.mockClear();
  sendVerificationEmailMock.mockReset();
  searchParams = new URLSearchParams();
});

describe("VerifyEmailPanel", () => {
  it("shows the check-your-email message with the address from the URL", () => {
    searchParams = new URLSearchParams({ email: "jane@example.com" });
    render(<VerifyEmailPanel />);

    expect(screen.getByText(/jane@example.com/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /resend verification email/i })).toBeInTheDocument();
  });

  it("redirects to /dashboard when the URL carries verified=true", () => {
    searchParams = new URLSearchParams({ verified: "true" });
    render(<VerifyEmailPanel />);

    expect(push).toHaveBeenCalledWith("/dashboard");
  });

  it("resend button calls sendVerificationEmail and then disables itself for the cooldown", async () => {
    const user = userEvent.setup();
    searchParams = new URLSearchParams({ email: "jane@example.com" });
    sendVerificationEmailMock.mockResolvedValue({ data: { status: true }, error: null });
    render(<VerifyEmailPanel />);

    const button = screen.getByRole("button", { name: /resend verification email/i });
    await user.click(button);

    expect(sendVerificationEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({ email: "jane@example.com" })
    );
    expect(await screen.findByText(/verification email sent/i)).toBeInTheDocument();
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("shows an error message when the resend call fails", async () => {
    const user = userEvent.setup();
    searchParams = new URLSearchParams({ email: "jane@example.com" });
    sendVerificationEmailMock.mockResolvedValue({
      data: null,
      error: { message: "Too many requests. Please try again later." },
    });
    render(<VerifyEmailPanel />);

    await user.click(screen.getByRole("button", { name: /resend verification email/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/too many requests/i);
  });
});

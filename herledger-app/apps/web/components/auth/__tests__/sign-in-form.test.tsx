// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams(),
}));

const signInEmail = vi.fn();
vi.mock("@/lib/auth/client", () => ({
  signIn: { email: (...args: unknown[]) => signInEmail(...args) },
}));

import { SignInForm } from "../sign-in-form";

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/email/i), "jane@example.com");
  await user.type(screen.getByLabelText(/password/i), "correct-password-123");
  await user.click(screen.getByRole("button", { name: /sign in/i }));
}

beforeEach(() => {
  push.mockClear();
  signInEmail.mockReset();
});

describe("SignInForm", () => {
  it("shows a resend-verification link when the sign-in fails with EMAIL_NOT_VERIFIED", async () => {
    const user = userEvent.setup();
    signInEmail.mockResolvedValue({
      data: null,
      error: { code: "EMAIL_NOT_VERIFIED", message: "Email not verified", status: 403 },
    });
    render(<SignInForm />);

    await fillAndSubmit(user);

    expect(await screen.findByRole("alert")).toHaveTextContent(/verify your email/i);
    const resendLink = screen.getByRole("link", { name: /resend verification email/i });
    expect(resendLink).toHaveAttribute("href", "/auth/verify-email?email=jane%40example.com");
  });

  it("does not show a resend link for an ordinary invalid-credentials error", async () => {
    const user = userEvent.setup();
    signInEmail.mockResolvedValue({
      data: null,
      error: {
        code: "INVALID_EMAIL_OR_PASSWORD",
        message: "Invalid email or password",
        status: 401,
      },
    });
    render(<SignInForm />);

    await fillAndSubmit(user);

    expect(await screen.findByRole("alert")).toHaveTextContent(/invalid email or password/i);
    expect(
      screen.queryByRole("link", { name: /resend verification email/i })
    ).not.toBeInTheDocument();
  });

  it("redirects to the dashboard on a successful sign-in", async () => {
    const user = userEvent.setup();
    signInEmail.mockResolvedValue({ data: { user: {} }, error: null });
    render(<SignInForm />);

    await fillAndSubmit(user);

    expect(push).toHaveBeenCalledWith("/dashboard");
  });
});

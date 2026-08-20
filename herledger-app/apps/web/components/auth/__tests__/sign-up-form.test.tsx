// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

const signUpEmail = vi.fn();
vi.mock("@/lib/auth/client", () => ({
  signUp: { email: (...args: unknown[]) => signUpEmail(...args) },
}));

import { SignUpForm } from "../sign-up-form";

beforeEach(() => {
  push.mockClear();
  signUpEmail.mockReset();
});

describe("SignUpForm", () => {
  it("does not show a strength meter before the user types a password", () => {
    render(<SignUpForm />);
    expect(screen.queryByText(/password strength/i)).not.toBeInTheDocument();
  });

  it("shows a live strength indicator once the password field has content", async () => {
    const user = userEvent.setup();
    render(<SignUpForm />);

    await user.type(screen.getByLabelText(/^password/i), "a");

    expect(screen.getByText(/password strength/i)).toBeInTheDocument();
  });

  it("rejects a password under 12 characters client-side without calling signUp", async () => {
    const user = userEvent.setup();
    render(<SignUpForm />);

    await user.type(screen.getByLabelText(/your name/i), "Jane Doe");
    await user.type(screen.getByLabelText(/email/i), "jane@example.com");
    await user.type(screen.getByLabelText(/^password/i), "short12345"); // 10 chars
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/at least 12 characters/i);
    expect(signUpEmail).not.toHaveBeenCalled();
  });

  it("redirects to /auth/verify-email (not the dashboard) after a successful sign-up", async () => {
    const user = userEvent.setup();
    signUpEmail.mockResolvedValue({ data: { user: { emailVerified: false } }, error: null });
    render(<SignUpForm />);

    await user.type(screen.getByLabelText(/your name/i), "Jane Doe");
    await user.type(screen.getByLabelText(/email/i), "jane@example.com");
    await user.type(screen.getByLabelText(/^password/i), "a-plenty-long-password");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(signUpEmail).toHaveBeenCalledWith(
      expect.objectContaining({ email: "jane@example.com", callbackURL: expect.any(String) })
    );
    expect(push).toHaveBeenCalledWith(
      expect.stringMatching(/^\/auth\/verify-email\?email=jane%40example\.com$/)
    );
  });
});

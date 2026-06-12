"use client";

import type { FormEvent, JSX } from "react";
import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";

export function AuthForm(): JSX.Element {
  const {
    createAccountWithEmail,
    error,
    isLoading,
    signInWithEmail,
    signInWithGoogle,
  } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState("");
  const isDisabled = isLoading;

  function validateEmailPassword(): boolean {
    if (email.trim() === "" || password.trim() === "") {
      setFormError("Enter an email and password.");
      return false;
    }

    setFormError("");
    return true;
  }

  async function handleSignIn(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!validateEmailPassword()) {
      return;
    }

    await signInWithEmail(email.trim(), password);
  }

  async function handleCreateAccount(): Promise<void> {
    if (!validateEmailPassword()) {
      return;
    }

    await createAccountWithEmail(email.trim(), password);
  }

  return (
    <form className="space-y-3" onSubmit={handleSignIn}>
      <button
        className="w-full rounded-md border border-[#b8c8b2] bg-white px-3 py-2 text-sm font-semibold text-[#24382d] transition hover:bg-[#edf3ea] disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isDisabled}
        onClick={() => {
          void signInWithGoogle();
        }}
        type="button"
      >
        Sign in with Google
      </button>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="min-w-0 space-y-1 text-xs font-semibold text-[#24382d]">
          <span>Email</span>
          <input
            autoComplete="email"
            className="w-full rounded-md border border-[#b8c8b2] bg-white px-3 py-2 text-sm font-normal text-[#14211b]"
            disabled={isDisabled}
            onChange={(event) => {
              setEmail(event.target.value);
              setFormError("");
            }}
            type="email"
            value={email}
          />
        </label>

        <label className="min-w-0 space-y-1 text-xs font-semibold text-[#24382d]">
          <span>Password</span>
          <input
            autoComplete="current-password"
            className="w-full rounded-md border border-[#b8c8b2] bg-white px-3 py-2 text-sm font-normal text-[#14211b]"
            disabled={isDisabled}
            onChange={(event) => {
              setPassword(event.target.value);
              setFormError("");
            }}
            type="password"
            value={password}
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          className="rounded-md bg-[#2f6b4f] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#25573f] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isDisabled}
          type="submit"
        >
          Sign in
        </button>
        <button
          className="rounded-md border border-[#b8c8b2] bg-white px-3 py-2 text-sm font-semibold text-[#24382d] transition hover:bg-[#edf3ea] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isDisabled}
          onClick={() => {
            void handleCreateAccount();
          }}
          type="button"
        >
          Create account
        </button>
      </div>

      {formError ? (
        <p className="text-sm font-medium text-[#8f2d2d]" role="alert">
          {formError}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm font-medium text-[#8f2d2d]" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}

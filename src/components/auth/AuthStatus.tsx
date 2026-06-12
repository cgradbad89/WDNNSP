"use client";

import type { JSX } from "react";
import { AuthForm } from "@/components/auth/AuthForm";
import { useAuth } from "@/components/auth/AuthProvider";

export function AuthStatus(): JSX.Element {
  const { error, isLoading, signOutUser, user } = useAuth();
  const displayName = user?.displayName || user?.email || "signed-in user";

  if (user) {
    return (
      <section
        aria-label="Authentication status"
        className="w-full max-w-xl rounded-md border border-[#d9e2d6] bg-[#f7faf6] p-3 text-sm text-[#405147] md:w-[440px]"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-semibold text-[#14211b]">
              Signed in as {displayName}
            </p>
            <p className="mt-1 leading-5">
              Wallet and search cloud sync are on for this account.
            </p>
          </div>
          <button
            className="w-fit rounded-md border border-[#b8c8b2] bg-white px-3 py-2 font-semibold text-[#24382d] transition hover:bg-[#edf3ea] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isLoading}
            onClick={() => {
              void signOutUser();
            }}
            type="button"
          >
            Sign out
          </button>
        </div>
        {error ? (
          <p className="mt-3 font-medium text-[#8f2d2d]" role="alert">
            {error}
          </p>
        ) : null}
      </section>
    );
  }

  return (
    <section
      aria-label="Authentication"
      className="w-full max-w-xl rounded-md border border-[#d9e2d6] bg-[#f7faf6] p-3 text-sm text-[#405147] md:w-[440px]"
    >
      <p className="mb-3 font-semibold text-[#14211b]">
        Sign in to sync your wallet and searches.
      </p>
      <AuthForm />
    </section>
  );
}

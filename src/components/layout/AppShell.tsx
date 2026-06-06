import type React from "react";
import type { JSX } from "react";
import { MainNav } from "@/components/layout/MainNav";

export function AppShell({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div className="min-h-screen bg-[#f7faf6] text-[#14211b]">
      <header className="border-b border-[#d9e2d6] bg-white/90">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-5 py-5 md:flex-row md:items-center md:justify-between md:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2f6b4f]">
              WDNNSP
            </p>
            <h1 className="text-xl font-semibold tracking-tight">
              We Dont Need No Sticken Points
            </h1>
          </div>
          <MainNav />
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-5 py-8 md:px-8">
        {children}
      </main>
    </div>
  );
}

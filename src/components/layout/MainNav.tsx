"use client";

import type { JSX } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/wallet", label: "Wallet" },
  { href: "/search", label: "Search" },
  { href: "/results", label: "Results" },
  { href: "/settings", label: "Settings" },
];

export function MainNav(): JSX.Element {
  const pathname = usePathname();

  return (
    <nav aria-label="Main navigation" className="flex flex-wrap gap-2">
      {navItems.map((item) => {
        const isActive = pathname === item.href;

        return (
          <Link
            aria-current={isActive ? "page" : undefined}
            className={`rounded-md px-3 py-2 text-sm font-medium transition ${
              isActive
                ? "bg-[#2f6b4f] text-white"
                : "text-[#405147] hover:bg-[#e8efe6] hover:text-[#14211b]"
            }`}
            href={item.href}
            key={item.href}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

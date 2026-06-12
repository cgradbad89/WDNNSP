"use client";

import type { JSX } from "react";
import { getPrimaryProviderMessages } from "@/lib/providers/display";
import type { ProviderMessage } from "@/lib/providers/types";

const severityClasses: Record<ProviderMessage["severity"], string> = {
  info: "bg-[#edf3ea] text-[#2f6b4f]",
  warning: "bg-[#fff9df] text-[#5d4c1d]",
  error: "bg-[#fff3ef] text-[#8f3b24]",
};

interface ProviderMessagesListProps {
  limit?: number;
  messages: ProviderMessage[];
}

export function ProviderMessagesList({
  limit,
  messages,
}: ProviderMessagesListProps): JSX.Element | null {
  const primaryMessages = getPrimaryProviderMessages(messages, limit);

  if (primaryMessages.length === 0) {
    return null;
  }

  return (
    <ul className="space-y-2 text-sm leading-6 text-[#526158]">
      {primaryMessages.map((message) => (
        <li
          className="flex flex-col gap-2 rounded-md border border-[#d9e2d6] bg-white p-3 sm:flex-row sm:items-start"
          key={`${message.code}:${message.message}`}
        >
          <span
            className={`w-fit rounded-md px-2 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${severityClasses[message.severity]}`}
          >
            {message.severity}
          </span>
          <span>{message.message}</span>
        </li>
      ))}
    </ul>
  );
}

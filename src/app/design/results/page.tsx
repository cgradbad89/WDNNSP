"use client";

import type { JSX, ReactNode } from "react";
import { useState } from "react";
import Link from "next/link";

const transferWarning =
  "Confirm award availability directly with the airline before transferring points. Transfers are often irreversible, and award space can disappear.";

const cppHelpText =
  "cpp means cents per point. It estimates redemption value by subtracting taxes and fees from the comparable cash price, then dividing by the points required. Higher is usually better, but route quality, fees, and transfer risk still matter.";

const summaryItems = [
  { label: "Search", value: "Tokyo Spring Trip" },
  { label: "Route", value: "WAS → TYO" },
  { label: "Dates", value: "May 1-10" },
  { label: "Cabin", value: "Business" },
  { label: "Passengers", value: "2" },
];

const metrics = [
  { label: "Score", value: "88" },
  { label: "Miles", value: "150k" },
  { label: "Taxes", value: "$186" },
  { label: "Cash", value: "$7,100" },
  { label: "cpp", value: "4.6", hasHelp: true },
];

const scoringWeights = [
  { label: "Value", value: "35%" },
  { label: "Points fit", value: "20%" },
  { label: "Convenience", value: "20%" },
  { label: "Availability confidence", value: "15%" },
  { label: "Transfer simplicity", value: "10%" },
];

const rankedOptions = [
  {
    id: "aeroplan",
    program: "Air Canada Aeroplan",
    label: "Best Overall",
    route: "IAD → YVR · 2h 15m layover → NRT",
    cabin: "Business",
    cost: "150,000 pts",
    fees: "$186",
    stops: "1 stop",
    cpp: "4.6",
    confidence: "High",
    tone: "bg-[#edf3ea] text-[#2f6b4f]",
    transferPaths: [
      {
        source: "Chase Ultimate Rewards",
        balance: "125,000",
        path: "Chase → Aeroplan",
        ratio: "1:1",
        needed: "75,000",
      },
      {
        source: "Amex Membership Rewards",
        balance: "92,000",
        path: "Amex → Aeroplan",
        ratio: "1:1",
        needed: "75,000",
      },
    ],
    details: {
      firstSegment: "IAD → YVR",
      firstTime: "5h 45m",
      layoverAirport: "YVR",
      layoverDuration: "2h 15m",
      secondSegment: "YVR → NRT",
      secondTime: "9h 20m",
      totalDuration: "17h 20m",
    },
  },
  {
    id: "virgin",
    program: "Virgin Atlantic Flying Club",
    label: "Best Value",
    route: "IAD → JFK · 3h 05m layover → HND",
    cabin: "Business",
    cost: "120,000 pts",
    fees: "$412",
    stops: "1 stop",
    cpp: "5.6",
    confidence: "Medium",
    tone: "bg-[#eef6f0] text-[#2f6b4f]",
    transferPaths: [
      {
        source: "Chase Ultimate Rewards",
        balance: "125,000",
        path: "Chase → Virgin Atlantic",
        ratio: "1:1",
        needed: "60,000",
      },
      {
        source: "Amex Membership Rewards",
        balance: "92,000",
        path: "Amex → Virgin Atlantic",
        ratio: "1:1",
        needed: "60,000",
      },
    ],
    details: {
      firstSegment: "IAD → JFK",
      firstTime: "1h 22m",
      layoverAirport: "JFK",
      layoverDuration: "3h 05m",
      secondSegment: "JFK → HND",
      secondTime: "14h 10m",
      totalDuration: "18h 37m",
    },
  },
  {
    id: "united",
    program: "United MileagePlus",
    label: "Lowest Fees",
    route: "IAD → SFO · 1h 45m layover → NRT",
    cabin: "Business",
    cost: "176,000 pts",
    fees: "$48",
    stops: "1 stop",
    cpp: "4.0",
    confidence: "High",
    tone: "bg-[#edf3ea] text-[#2f6b4f]",
    transferPaths: [
      {
        source: "Chase Ultimate Rewards",
        balance: "125,000",
        path: "Chase → United",
        ratio: "1:1",
        needed: "132,000",
      },
      {
        source: "Bilt Rewards",
        balance: "28,000",
        path: "Bilt → United",
        ratio: "1:1",
        needed: "132,000",
      },
    ],
    details: {
      firstSegment: "IAD → SFO",
      firstTime: "5h 55m",
      layoverAirport: "SFO",
      layoverDuration: "1h 45m",
      secondSegment: "SFO → NRT",
      secondTime: "11h 05m",
      totalDuration: "18h 45m",
    },
  },
];

type RankedOption = (typeof rankedOptions)[number];
type ModalState = "edit" | RankedOption["id"] | null;

function CppHelp() {
  return (
    <span className="group relative inline-flex items-center gap-1 align-middle normal-case tracking-normal">
      <span>cpp</span>
      <button
        aria-label="What does cpp mean?"
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[#b8c8b2] bg-white text-[11px] font-bold leading-none text-[#2f6b4f] outline-none transition hover:bg-[#edf3ea] focus:bg-[#edf3ea] focus:ring-2 focus:ring-[#2f6b4f]/20"
        type="button"
      >
        ?
      </button>
      <span
        className="pointer-events-none absolute left-0 top-7 z-20 hidden w-72 rounded-md border border-[#b8c8b2] bg-white p-3 text-left text-xs font-medium leading-5 tracking-normal text-[#405147] shadow-[0_14px_34px_rgba(31,63,45,0.16)] group-focus-within:block group-hover:block"
        role="tooltip"
      >
        {cppHelpText}
      </span>
    </span>
  );
}

function PlaneIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M3.5 12.5h16.2c.8 0 1.1 1 .4 1.4l-4.2 2.7-1 3.4h-2.1l.4-4.9-4.9 2.4H6.1l2.8-4.3-5.4-.7Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <path
        d="m9 12.4-2.8-4h2.2l5.2 3.9"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 20 20"
    >
      <path
        d="m4.2 10.4 3.4 3.2 8.2-8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.9"
      />
    </svg>
  );
}

function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 20 20"
    >
      <path
        d="M4 10h11m0 0-4-4m4 4-4 4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function MetricCard({
  hasHelp,
  label,
  value,
}: {
  hasHelp?: boolean;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-h-28 flex-col items-center justify-center rounded-md border border-white/12 bg-white/8 p-4 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#a8d5bd]">
        {hasHelp ? <CppHelp /> : label}
      </p>
      <p className="mt-3 text-2xl font-semibold leading-none text-white">
        {value}
      </p>
    </div>
  );
}

function Modal({
  children,
  onClose,
  title,
}: {
  children: ReactNode;
  onClose: () => void;
  title: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-[#14211b]/45 p-0 sm:items-center sm:justify-center sm:p-6">
      <section
        aria-label={title}
        aria-modal="true"
        className="max-h-[88vh] w-full overflow-y-auto rounded-t-lg border border-[#d9e2d6] bg-white p-5 shadow-[0_24px_70px_rgba(20,33,27,0.28)] sm:max-w-2xl sm:rounded-lg sm:p-6"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-xl font-semibold tracking-tight text-[#14211b]">
            {title}
          </h3>
          <button
            className="rounded-md border border-[#b8c8b2] px-3 py-2 text-sm font-semibold text-[#24382d] transition hover:bg-[#edf3ea]"
            data-testid="design-modal-close"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

function EditSearchModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal onClose={onClose} title="Edit search">
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {[
          ["Trip name", "Tokyo Spring Trip"],
          ["From", "WAS"],
          ["To", "TYO"],
          ["Depart", "2027-05-01"],
          ["Return", "2027-05-10"],
          ["Cabin", "Business"],
          ["Passengers", "2"],
          ["Max stops", "1 stop"],
        ].map(([label, value]) => (
          <label className="block" key={label}>
            <span className="text-sm font-semibold text-[#24382d]">
              {label}
            </span>
            <input
              className="mt-2 w-full rounded-md border border-[#b8c8b2] bg-[#f9fbf8] px-4 py-3 text-sm font-semibold text-[#14211b] outline-none transition focus:border-[#2f6b4f] focus:bg-white focus:ring-4 focus:ring-[#2f6b4f]/10"
              defaultValue={value}
              type="text"
            />
          </label>
        ))}
      </div>
      <div className="mt-5 rounded-md border border-[#d9e2d6] bg-[#f7faf6] p-4 text-sm leading-6 text-[#526158]">
        Design-only drawer: future implementation can update results after
        these fields change.
      </div>
    </Modal>
  );
}

function RouteDetailsModal({
  onClose,
  option,
}: {
  onClose: () => void;
  option: RankedOption;
}) {
  const detailRows = [
    ["Segment 1", option.details.firstSegment],
    ["Flight time", option.details.firstTime],
    ["Layover airport", option.details.layoverAirport],
    ["Layover duration", option.details.layoverDuration],
    ["Segment 2", option.details.secondSegment],
    ["Flight time", option.details.secondTime],
    ["Total duration", option.details.totalDuration],
  ];

  return (
    <Modal onClose={onClose} title={`${option.program} route details`}>
      <div className="mt-5 rounded-lg border border-[#d9e2d6] bg-[#f7faf6] p-4">
        <p className="text-sm font-semibold text-[#24382d]">{option.route}</p>
        <div className="mt-4 grid gap-3">
          {detailRows.map(([label, value]) => (
            <div
              className="flex items-center justify-between gap-4 border-b border-[#d9e2d6] pb-3 last:border-b-0 last:pb-0"
              key={`${label}-${value}`}
            >
              <span className="text-sm text-[#637268]">{label}</span>
              <span className="text-sm font-semibold text-[#14211b]">
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}

function TransferPaths({ option }: { option: RankedOption }) {
  return (
    <div className="mt-4 rounded-md border border-[#d9e2d6] bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-[#fff9df] px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-[#5d4c1d]">
          Transfer required
        </span>
        <span className="text-xs font-semibold uppercase tracking-[0.1em] text-[#637268]">
          Top paths
        </span>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {option.transferPaths.map((path) => (
          <div
            className="rounded-md border border-[#d9e2d6] bg-[#f7faf6] p-3"
            key={`${option.id}-${path.path}`}
          >
            <p className="text-sm font-semibold text-[#14211b]">{path.path}</p>
            <p className="mt-1 text-xs leading-5 text-[#637268]">
              You have {path.source}: {path.balance}
            </p>
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.1em] text-[#2f6b4f]">
              {path.ratio} · Needed: {path.needed}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function AwardCard({
  onRouteDetails,
  option,
}: {
  onRouteDetails: () => void;
  option: RankedOption;
}) {
  return (
    <article className="rounded-lg border border-[#d9e2d6] bg-white p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-md px-2.5 py-1 text-xs font-semibold ${option.tone}`}
            >
              {option.label}
            </span>
            <span className="rounded-md bg-[#f7faf6] px-2.5 py-1 text-xs font-semibold text-[#637268]">
              {option.confidence} confidence
            </span>
            <span className="rounded-md bg-[#fff9df] px-2.5 py-1 text-xs font-semibold text-[#5d4c1d]">
              Transfer required
            </span>
          </div>
          <h4 className="mt-3 text-xl font-semibold tracking-tight text-[#14211b]">
            {option.program}
          </h4>
          <p className="mt-2 text-sm font-semibold leading-6 text-[#405147]">
            {option.route}
          </p>
          <button
            className="mt-2 text-sm font-semibold text-[#2f6b4f] underline-offset-4 hover:underline"
            data-testid={`design-route-details-${option.id}`}
            onClick={onRouteDetails}
            type="button"
          >
            View route details
          </button>
        </div>
        <p className="text-2xl font-semibold tracking-tight text-[#14211b]">
          {option.cost}
        </p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#637268]">
            Taxes / fees
          </p>
          <p className="mt-1 text-sm font-semibold text-[#14211b]">
            {option.fees}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#637268]">
            Stops
          </p>
          <p className="mt-1 text-sm font-semibold text-[#14211b]">
            {option.stops}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#637268]">
            Cabin
          </p>
          <p className="mt-1 text-sm font-semibold text-[#14211b]">
            {option.cabin}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#637268]">
            <CppHelp />
          </p>
          <p className="mt-1 text-sm font-semibold text-[#14211b]">
            {option.cpp}
          </p>
        </div>
      </div>

      <TransferPaths option={option} />
    </article>
  );
}

export default function ResultsDesignPage(): JSX.Element {
  const [modal, setModal] = useState<ModalState>(null);
  const [filterActive, setFilterActive] = useState(false);
  const [toast, setToast] = useState("");
  const selectedRouteOption =
    modal && modal !== "edit"
      ? rankedOptions.find((option) => option.id === modal)
      : undefined;

  function showPrototypeToast(message: string): void {
    setToast(message);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-[#d9e2d6] bg-white p-5 shadow-[0_18px_50px_rgba(31,63,45,0.08)] md:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2f6b4f]">
              Results design prototype
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#14211b] md:text-4xl">
              Best option for Tokyo Spring Trip
            </h2>
            <p className="mt-3 max-w-xl text-base leading-7 text-[#526158]">
              Mock cash and award data are compared here to show the revised
              flow: run a search, inspect results, then save only useful trips.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            <button
              className="rounded-md bg-[#2f6b4f] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#25573f]"
              data-testid="design-results-edit-search"
              onClick={() => setModal("edit")}
              type="button"
            >
              Edit search
            </button>
            <button
              className="rounded-md border border-[#b8c8b2] px-5 py-3 text-sm font-semibold text-[#24382d] transition hover:bg-[#edf3ea]"
              data-testid="design-results-save-search"
              onClick={() =>
                showPrototypeToast("Prototype: Tokyo Spring Trip marked ready to save from Results.")
              }
              type="button"
            >
              Save search
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-5">
        {summaryItems.map((item) => (
          <article
            className="rounded-lg border border-[#d9e2d6] bg-white p-4"
            key={item.label}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#637268]">
              {item.label}
            </p>
            <p className="mt-2 text-lg font-semibold tracking-tight text-[#14211b]">
              {item.value}
            </p>
          </article>
        ))}
      </section>

      {toast ? (
        <section className="rounded-lg border border-[#d9e2d6] bg-[#edf3ea] p-4 text-sm font-semibold leading-6 text-[#2f6b4f]">
          {toast}
        </section>
      ) : null}

      <section className="rounded-lg border border-[#d9e2d6] bg-[#0f2f22] p-5 text-white shadow-[0_18px_50px_rgba(15,47,34,0.18)] md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#a8d5bd]">
              Best Overall
            </p>
            <h3 className="mt-3 max-w-3xl text-2xl font-semibold tracking-tight">
              Transfer Chase or Amex points to Air Canada Aeroplan
            </h3>
          </div>
          <PlaneIcon className="h-10 w-10 shrink-0 text-[#a8d5bd]" />
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {metrics.map((metric) => (
            <MetricCard
              hasHelp={metric.hasHelp}
              key={metric.label}
              label={metric.label}
              value={metric.value}
            />
          ))}
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {[
            "Strong redemption value against a high business-class cash benchmark.",
            "Chase and Amex both provide direct transfer paths to Aeroplan.",
            "Transfer requirement is visible before any points move.",
            "One-stop routing keeps convenience acceptable for the value.",
          ].map((bullet) => (
            <div className="flex gap-3 text-sm leading-6" key={bullet}>
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#a8d5bd] text-[#0f2f22]">
                <CheckIcon className="h-3.5 w-3.5" />
              </span>
              <span className="text-[#e7f2eb]">{bullet}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-[#ead99d] bg-[#fff9df] p-5 md:p-6">
        <p className="text-sm font-semibold text-[#5d4c1d]">
          {transferWarning}
        </p>
      </section>

      <section className="rounded-lg border border-[#d9e2d6] bg-white p-5 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2f6b4f]">
              Lowest reasonable cash fare
            </p>
            <h3 className="mt-2 text-4xl font-semibold tracking-tight text-[#14211b]">
              $7,100
            </h3>
          </div>
          <p className="max-w-xl text-sm leading-6 text-[#637268]">
            This mock business fare for two travelers is the comparable cash
            benchmark used to calculate redemption value after taxes and fees.
          </p>
        </div>
      </section>

      <section className="rounded-lg border border-[#d9e2d6] bg-white p-5 md:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2f6b4f]">
              Ranked award options
            </p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#14211b]">
              Booking paths to investigate first
            </h3>
          </div>
          <p className="text-sm text-[#637268]">
            Mock data for design review
          </p>
        </div>

        <div className="mt-5 grid gap-4">
          {rankedOptions.map((option) => (
            <AwardCard
              key={option.id}
              onRouteDetails={() => setModal(option.id)}
              option={option}
            />
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-lg border border-[#d9e2d6] bg-white p-5 md:p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2f6b4f]">
            Filters
          </p>
          <div className="mt-4 space-y-3">
            <button
              className={`flex w-full items-center justify-between gap-3 rounded-md border px-3 py-3 text-left text-sm font-semibold transition ${
                filterActive
                  ? "border-[#2f6b4f] bg-[#edf3ea] text-[#2f6b4f]"
                  : "border-[#d9e2d6] bg-[#f7faf6] text-[#24382d] hover:bg-[#edf3ea]"
              }`}
              data-testid="design-results-transferable-filter"
              onClick={() => {
                setFilterActive((currentValue) => !currentValue);
                showPrototypeToast(
                  "Prototype filter: later implementation will show only options bookable with transferable points.",
                );
              }}
              type="button"
            >
              Show only options bookable with my transferable points
              <span>{filterActive ? "On" : "Off"}</span>
            </button>
            {["Business cabin", "1 stop or less", "Hide low confidence"].map(
              (filter) => (
                <button
                  className="w-full rounded-md border border-[#d9e2d6] bg-[#f7faf6] px-3 py-3 text-left text-sm font-semibold text-[#24382d] transition hover:bg-[#edf3ea]"
                  key={filter}
                  onClick={() =>
                    showPrototypeToast(`${filter} is a prototype-only filter.`)
                  }
                  type="button"
                >
                  {filter}
                </button>
              ),
            )}
          </div>
        </article>

        <article className="rounded-lg border border-[#d9e2d6] bg-white p-5 md:p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2f6b4f]">
            Scoring weights
          </p>
          <div className="mt-4 space-y-3">
            {scoringWeights.map((weight) => (
              <div
                className="flex items-center justify-between gap-4 border-b border-[#edf3ea] pb-3 last:border-b-0 last:pb-0"
                key={weight.label}
              >
                <span className="text-sm text-[#526158]">{weight.label}</span>
                <span className="text-sm font-semibold text-[#14211b]">
                  {weight.value}
                </span>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-lg border border-[#d9e2d6] bg-white p-5 md:p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2f6b4f]">
            Next actions
          </p>
          <div className="mt-4 space-y-3">
            <button
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#2f6b4f] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#25573f]"
              onClick={() =>
                showPrototypeToast("Prototype: open Aeroplan and confirm award space.")
              }
              type="button"
            >
              Check Aeroplan
              <ArrowIcon className="h-4 w-4" />
            </button>
            <button
              className="w-full rounded-md border border-[#b8c8b2] px-4 py-3 text-sm font-semibold text-[#24382d] transition hover:bg-[#edf3ea]"
              onClick={() => setModal("edit")}
              type="button"
            >
              Edit search
            </button>
            <Link
              className="block rounded-md border border-[#b8c8b2] px-4 py-3 text-center text-sm font-semibold text-[#24382d] transition hover:bg-[#edf3ea]"
              href="/design/search"
            >
              Start a new search
            </Link>
          </div>
        </article>
      </section>

      {modal === "edit" ? <EditSearchModal onClose={() => setModal(null)} /> : null}
      {selectedRouteOption ? (
        <RouteDetailsModal
          onClose={() => setModal(null)}
          option={selectedRouteOption}
        />
      ) : null}
    </div>
  );
}

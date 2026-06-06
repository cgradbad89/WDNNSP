import { describe, expect, it } from "vitest";
import { formatDuration, formatRouteSummary } from "@/lib/results/routeDetails";
import type { RouteDetail } from "@/types/flights";

const routeDetail: RouteDetail = {
  segments: [
    {
      id: "seg-1",
      flightNumber: "AC103",
      origin: "IAD",
      destination: "YVR",
      departureTime: "09:15",
      arrivalTime: "11:00",
      durationMinutes: 345,
    },
    {
      id: "seg-2",
      flightNumber: "NH115",
      origin: "YVR",
      destination: "NRT",
      departureTime: "13:15",
      arrivalTime: "17:05",
      durationMinutes: 430,
    },
  ],
  layovers: [{ airport: "YVR", durationMinutes: 135 }],
  totalDurationMinutes: 910,
};

describe("route detail formatting", () => {
  it("formats hours and minutes", () => {
    expect(formatDuration(135)).toBe("2h 15m");
  });

  it("formats minute-only durations", () => {
    expect(formatDuration(45)).toBe("45m");
  });

  it("includes layover airport and duration in route summary", () => {
    expect(formatRouteSummary(routeDetail)).toBe(
      "IAD \u2192 YVR \u00b7 2h 15m layover \u2192 NRT",
    );
  });
});

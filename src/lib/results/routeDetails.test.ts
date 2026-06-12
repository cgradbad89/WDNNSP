import { describe, expect, it } from "vitest";
import {
  createFlightItineraryFromRouteDetail,
  formatDuration,
  formatRouteSummary,
  hasMixedCabin,
} from "@/lib/results/routeDetails";
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

const nonstopRouteDetail: RouteDetail = {
  segments: [
    {
      id: "seg-nonstop",
      flightNumber: "UA100",
      origin: "IAD",
      destination: "NRT",
      departureTime: "09:00",
      arrivalTime: "17:00",
      durationMinutes: 815,
    },
  ],
  layovers: [],
  totalDurationMinutes: 815,
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

  it("does not include layover text for nonstop route summaries", () => {
    expect(formatRouteSummary(nonstopRouteDetail)).toBe("IAD \u2192 NRT");
  });

  it("creates a nonstop itinerary from route details", () => {
    expect(createFlightItineraryFromRouteDetail(nonstopRouteDetail)).toEqual({
      segments: [
        {
          id: "seg-nonstop",
          flightNumber: "UA100",
          origin: "IAD",
          destination: "NRT",
          departureTime: "09:00",
          arrivalTime: "17:00",
          durationMinutes: 815,
        },
      ],
      layovers: [],
      durationMinutes: 815,
      stopCount: 0,
      hasMixedCabin: false,
    });
  });

  it("creates a one-stop itinerary from route details", () => {
    expect(createFlightItineraryFromRouteDetail(routeDetail)).toMatchObject({
      segments: [
        {
          id: "seg-1",
          origin: "IAD",
          destination: "YVR",
        },
        {
          id: "seg-2",
          origin: "YVR",
          destination: "NRT",
        },
      ],
      layovers: [{ airport: "YVR", durationMinutes: 135 }],
      durationMinutes: 910,
      stopCount: 1,
      hasMixedCabin: false,
    });
  });

  it("detects mixed-cabin itineraries", () => {
    expect(
      hasMixedCabin({
        segments: [
          {
            id: "seg-1",
            origin: "IAD",
            destination: "YVR",
            cabin: "business",
          },
          {
            id: "seg-2",
            origin: "YVR",
            destination: "NRT",
            cabin: "economy",
          },
        ],
      }),
    ).toBe(true);
  });
});

import type { RouteDetail } from "@/types/flights";
import type { FlightItinerary } from "@/types/routes";

export function formatDuration(minutes: number): string {
  const safeMinutes = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safeMinutes / 60);
  const remainingMinutes = safeMinutes % 60;

  if (hours === 0) {
    return `${remainingMinutes}m`;
  }

  if (remainingMinutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainingMinutes}m`;
}

export function formatRouteSummary(routeDetail: RouteDetail): string {
  const [firstSegment] = routeDetail.segments;

  if (!firstSegment) {
    return "Route details unavailable";
  }

  return routeDetail.segments.reduce((summary, segment, index) => {
    const layover = routeDetail.layovers[index];
    const destinationSummary = `${summary} \u2192 ${segment.destination}`;

    if (!layover) {
      return destinationSummary;
    }

    return `${destinationSummary} \u00b7 ${formatDuration(
      layover.durationMinutes,
    )} layover`;
  }, firstSegment.origin);
}

export function hasMixedCabin(itinerary: Pick<FlightItinerary, "segments">): boolean {
  const cabins = new Set(
    itinerary.segments
      .map((segment) => segment.cabin)
      .filter((cabin): cabin is string => Boolean(cabin)),
  );

  return cabins.size > 1;
}

export function createFlightItineraryFromRouteDetail(
  routeDetail: RouteDetail,
): FlightItinerary {
  const itinerary: FlightItinerary = {
    segments: routeDetail.segments.map((segment) => ({
      id: segment.id,
      flightNumber: segment.flightNumber,
      origin: segment.origin,
      destination: segment.destination,
      departureTime: segment.departureTime,
      arrivalTime: segment.arrivalTime,
      durationMinutes: segment.durationMinutes,
    })),
    layovers: routeDetail.layovers.map((layover) => ({
      airport: layover.airport,
      durationMinutes: layover.durationMinutes,
    })),
    durationMinutes: routeDetail.totalDurationMinutes,
    stopCount: routeDetail.layovers.length,
  };

  return {
    ...itinerary,
    hasMixedCabin: hasMixedCabin(itinerary),
  };
}

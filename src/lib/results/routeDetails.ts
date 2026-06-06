import type { RouteDetail } from "@/types/flights";

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

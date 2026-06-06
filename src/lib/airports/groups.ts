import type { AirportGroup } from "@/types/airports";

export function expandAirportCode(
  code: string,
  airportGroups: AirportGroup[],
): string[] {
  const normalizedCode = code.trim().toUpperCase();
  const matchingGroup = airportGroups.find(
    (group) => group.code.toUpperCase() === normalizedCode,
  );

  if (!matchingGroup) {
    return [normalizedCode];
  }

  return matchingGroup.airportCodes.map((airportCode) =>
    airportCode.toUpperCase(),
  );
}

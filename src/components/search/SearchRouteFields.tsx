"use client";

import type { JSX } from "react";
import { AirportAutocomplete } from "@/components/search/AirportAutocomplete";

interface SearchRouteFieldsProps {
  destination: string;
  destinationError?: string;
  onChangeDestination: (value: string) => void;
  onChangeOrigin: (value: string) => void;
  origin: string;
  originError?: string;
}

export function SearchRouteFields({
  destination,
  destinationError,
  onChangeDestination,
  onChangeOrigin,
  origin,
  originError,
}: SearchRouteFieldsProps): JSX.Element {
  return (
    <div className="mt-4 grid gap-4 sm:grid-cols-2">
      <AirportAutocomplete
        error={originError}
        hint="Choose an airport or supported metro area."
        id="origin"
        label="From"
        onChange={onChangeOrigin}
        onSelect={() => undefined}
        placeholder="WAS, IAD, Tokyo"
        value={origin}
      />
      <AirportAutocomplete
        error={destinationError}
        hint="Airport groups search every listed airport."
        id="destination"
        label="To"
        onChange={onChangeDestination}
        onSelect={() => undefined}
        placeholder="TYO, HND, London"
        value={destination}
      />
    </div>
  );
}

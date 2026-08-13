"use client";

import type { JSX } from "react";
import { AirportAutocomplete } from "@/components/search/AirportAutocomplete";
import { AirportSwapButton } from "@/components/search/AirportSwapButton";

interface SearchRouteFieldsProps {
  destination: string;
  destinationError?: string;
  onChangeDestination: (value: string) => void;
  onChangeOrigin: (value: string) => void;
  onSwap: () => void;
  origin: string;
  originError?: string;
}

export function SearchRouteFields({
  destination,
  destinationError,
  onChangeDestination,
  onChangeOrigin,
  onSwap,
  origin,
  originError,
}: SearchRouteFieldsProps): JSX.Element {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <AirportAutocomplete
        error={originError}
        hint="Choose an airport or supported metro area."
        id="origin"
        label="From"
        onChange={onChangeOrigin}
        onSelect={() => undefined}
        placeholder="WAS, IAD, Tokyo"
        value={origin}
        variant="bar"
      />
      <AirportSwapButton onSwap={onSwap} />
      <AirportAutocomplete
        error={destinationError}
        hint="Airport groups search every listed airport."
        id="destination"
        label="To"
        onChange={onChangeDestination}
        onSelect={() => undefined}
        placeholder="TYO, HND, London"
        value={destination}
        variant="bar"
      />
    </div>
  );
}

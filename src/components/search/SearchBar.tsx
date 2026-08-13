"use client";

import type { JSX } from "react";
import { SearchDatesField } from "@/components/search/SearchDatesField";
import { SearchRouteFields } from "@/components/search/SearchRouteFields";
import { SearchSubmitButton } from "@/components/search/SearchSubmitActions";
import { SearchTravelersCabinField } from "@/components/search/SearchTravelersCabinField";
import { TripTypeToggle } from "@/components/search/TripTypeToggle";
import type { Cabin } from "@/types/flights";
import type { TripType } from "@/types/search";

interface SearchBarProps {
  cabin: Cabin;
  cabinError?: string;
  departDate: string;
  departDateError?: string;
  destination: string;
  destinationError?: string;
  flexibleDays: string;
  flexibleDaysError?: string;
  isSearchDisabled?: boolean;
  maxStops: string;
  maxStopsError?: string;
  onChangeCabin: (value: Cabin) => void;
  onChangeDepartDate: (value: string) => void;
  onChangeDestination: (value: string) => void;
  onChangeFlexibleDays: (value: string) => void;
  onChangeMaxStops: (value: string) => void;
  onChangeOrigin: (value: string) => void;
  onChangePassengers: (value: string) => void;
  onChangeReturnDate: (value: string) => void;
  onChangeTripType: (value: TripType) => void;
  onSwap: () => void;
  origin: string;
  originError?: string;
  passengers: string;
  passengersError?: string;
  returnDate: string;
  returnDateError?: string;
  tripType: TripType;
}

/**
 * Single horizontal search bar: trip-type toggle above, then From/To with a
 * swap control, a combined dates field, a combined travelers+cabin field,
 * and the search button, all in one row. Every field here is a restyled
 * composition of the existing search components (AirportAutocomplete,
 * SearchDateFields, SearchCabinField, SearchTravelersFields) - none of
 * their matching/validation logic changed.
 */
export function SearchBar({
  cabin,
  cabinError,
  departDate,
  departDateError,
  destination,
  destinationError,
  flexibleDays,
  flexibleDaysError,
  isSearchDisabled,
  maxStops,
  maxStopsError,
  onChangeCabin,
  onChangeDepartDate,
  onChangeDestination,
  onChangeFlexibleDays,
  onChangeMaxStops,
  onChangeOrigin,
  onChangePassengers,
  onChangeReturnDate,
  onChangeTripType,
  onSwap,
  origin,
  originError,
  passengers,
  passengersError,
  returnDate,
  returnDateError,
  tripType,
}: SearchBarProps): JSX.Element {
  return (
    <div>
      <TripTypeToggle onChange={onChangeTripType} value={tripType} />

      <div className="mt-3 flex flex-col gap-3 rounded-md border border-[#b8c8b2] bg-[#f9fbf8] p-3 lg:flex-row lg:items-center lg:gap-0 lg:divide-x lg:divide-[#d9e2d6] lg:p-2">
        <div className="lg:px-3">
          <SearchRouteFields
            destination={destination}
            destinationError={destinationError}
            onChangeDestination={onChangeDestination}
            onChangeOrigin={onChangeOrigin}
            onSwap={onSwap}
            origin={origin}
            originError={originError}
          />
        </div>
        <div className="lg:px-3 lg:min-w-[220px]">
          <SearchDatesField
            departDate={departDate}
            departDateError={departDateError}
            onChangeDepartDate={onChangeDepartDate}
            onChangeReturnDate={onChangeReturnDate}
            returnDate={returnDate}
            returnDateError={returnDateError}
            tripType={tripType}
          />
        </div>
        <div className="lg:px-3 lg:min-w-[220px]">
          <SearchTravelersCabinField
            cabin={cabin}
            cabinError={cabinError}
            flexibleDays={flexibleDays}
            flexibleDaysError={flexibleDaysError}
            maxStops={maxStops}
            maxStopsError={maxStopsError}
            onChangeCabin={onChangeCabin}
            onChangeFlexibleDays={onChangeFlexibleDays}
            onChangeMaxStops={onChangeMaxStops}
            onChangePassengers={onChangePassengers}
            passengers={passengers}
            passengersError={passengersError}
          />
        </div>
        <div className="lg:pl-3">
          <SearchSubmitButton isDisabled={isSearchDisabled} />
        </div>
      </div>
    </div>
  );
}

import type { AirportGroup } from "@/types/airports";

export const AIRPORT_GROUPS: AirportGroup[] = [
  {
    code: "WAS",
    name: "Washington, DC Area",
    airportCodes: ["DCA", "IAD", "BWI"],
  },
  {
    code: "NYC",
    name: "New York City Area",
    airportCodes: ["JFK", "LGA", "EWR"],
  },
  { code: "TYO", name: "Tokyo Area", airportCodes: ["HND", "NRT"] },
  {
    code: "LON",
    name: "London Area",
    airportCodes: ["LHR", "LGW", "LCY", "STN", "LTN"],
  },
  { code: "PAR", name: "Paris Area", airportCodes: ["CDG", "ORY"] },
];

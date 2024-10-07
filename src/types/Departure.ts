export type Departure = {
  plannedArrival: Date | null;
  plannedDeparture: Date;

  tripId: string;
  realtimeTripId?: string;
  tripName: string;
  headsign: string;

  stopType: "pickup" | "dropoff" | "inbetween";

  route: {
    routeId: string;

    routeColor: string | null;
    routeTextColor: string | null;

    routeShortName: string;
    routeLongName: string;

    agencyId: string;
    agencyName: string;
  };
};

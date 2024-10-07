import GtfsRealtimeBindings from "gtfs-realtime-bindings";
import parseCsv from "csv-simple-parser";

import { Hono } from "hono";
import type {
  GTFSAgency,
  GTFSRoute,
  GTFSStop,
  GTFSStopTime,
  GTFSTrip,
} from "./types/GTFS";
import type { Departure } from "./types/Departure";
import type { CalendarDate } from "./types/GTFS/Calendar";

const app = new Hono();

const stopsData = await Bun.file("data/gtfs-nl/stops.txt").text();
const stops = parseCsv(stopsData, { header: true }) as GTFSStop[];

const stopTimesData = await Bun.file("data/gtfs-nl/stop_times.txt").text();
const stopTimes = parseCsv(stopTimesData, { header: true }) as GTFSStopTime[];

const trips = await Bun.file("data/gtfs-nl/trips.txt").text();
const tripsData = parseCsv(trips, { header: true }) as GTFSTrip[];

const routes = await Bun.file("data/gtfs-nl/routes.txt").text();
const routesData = parseCsv(routes, { header: true }) as GTFSRoute[];

const agencies = await Bun.file("data/gtfs-nl/agency.txt").text();
const agenciesData = parseCsv(agencies, { header: true }) as GTFSAgency[];

const calendarData = await Bun.file("data/gtfs-nl/calendar_dates.txt").text();
const calendar = parseCsv(calendarData, { header: true }) as CalendarDate[];

const tripUpdatesData = await Bun.file("data/tripUpdates.pb").arrayBuffer();
const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
  new Uint8Array(tripUpdatesData)
);

/**
 * More efficient way to get the stop times
 * for a trip
 * @param tripId
 * @returns
 */
function getStopTimesForTrip(tripId: string) {
  const stopTimeItems: GTFSStopTime[] = [];
  let lastIndex = 0;

  for (const [index, item] of stopTimes.entries()) {
    if (item.trip_id === tripId) {
      stopTimeItems.push(item);
      lastIndex = index;
    } else if (lastIndex > 0) {
      break;
    }
  }

  return stopTimeItems;
}

app.get("/tripUpdates", (ctx) => {
  return ctx.json(feed);
});

app.get("/stops", (ctx) => {
  const query = ctx.req.query("q");
  if (!query) {
    return ctx.json(stops);
  }

  const foundStops = stops.filter((stop) => {
    if (!stop || !stop.stop_name) return false;
    return stop.stop_name.toLowerCase().includes(query);
  });

  return ctx.json(foundStops);
});

app.get("/:stopId/departures", async (ctx) => {
  const stopId = ctx.req.param("stopId");
  const shouldReturnRaw = ctx.req.query("raw");

  const now = new Date();
  // Calendar date string, eg: 20241214
  const todayCalString = now.toISOString().split("T")[0].split("-").join("");
  const todayFeedString = now.toISOString().split("T")[0];

  const foundStops = stops.filter(
    (stop) =>
      stop.stop_id === stopId ||
      stop.parent_station == stopId ||
      stop.parent_station == `stoparea:${stopId}`
  );
  const stopIds = foundStops.map((stop) => stop.stop_id);

  if (!stopId) {
    return ctx.json({ error: "Missing stopId parameter" });
  }

  const times = stopTimes
    .filter((time) => {
      if (!stopIds.includes(time.stop_id) || !time.departure_time) return false;

      const [hours, minutes] = time.departure_time.split(":");
      const departureTime = new Date();
      departureTime.setHours(parseInt(hours));
      departureTime.setMinutes(parseInt(minutes));
      return departureTime > now;
    })
    .map((time) => {
      const trip = tripsData.find((trip) => trip.trip_id === time.trip_id);
      return {
        ...time,
        trip: trip || null,
      };
    })
    .filter(
      (item) =>
        !!calendar.find(
          (cal) =>
            cal.service_id === item.trip?.service_id &&
            cal.date === todayCalString
        )
    );

  if (shouldReturnRaw == "true") {
    return ctx.json(times);
  }

  const properDepartures: Departure[] = times
    .map((time) => {
      const route = routesData.find(
        (route) => route.route_id === time.trip?.route_id
      );

      const agency = agenciesData.find(
        (agency) => agency.agency_id === route?.agency_id
      );

      // const feedData = feed.entity.find(
      //   (item) => item.id == `${todayFeedString}:${time.trip?.realtime_trip_id}`
      // );

      let stopType: Departure["stopType"] = "inbetween";

      if (time.pickup_type === "1") {
        stopType = "pickup";
      } else if (time.drop_off_type === "1") {
        stopType = "dropoff";
      }

      const item: Departure = {
        tripId: time.trip_id,
        realtimeTripId: time.trip?.realtime_trip_id,
        stopType,
        plannedArrival: null,
        plannedDeparture: new Date(),
        tripName: time.trip?.trip_long_name ?? "",
        headsign: time.stop_headsign?.length
          ? time.stop_headsign
          : time.trip?.trip_headsign ?? "",
        route: {
          agencyId: route?.agency_id ?? "",
          agencyName: agency?.agency_name ?? "",
          routeColor: route?.route_color ?? null,
          routeTextColor: route?.route_text_color ?? null,
          routeId: time.trip?.route_id ?? "",
          routeLongName: route?.route_long_name ?? "",
          routeShortName: route?.route_short_name ?? "",
        },
      };

      if (time.arrival_time) {
        const [hours, minutes, seconds] = time.arrival_time.split(":");

        item.plannedArrival = new Date();
        item.plannedArrival.setHours(parseInt(hours));
        item.plannedArrival.setMinutes(parseInt(minutes));
        item.plannedArrival.setSeconds(parseInt(seconds ?? 0));
        item.plannedArrival.setMilliseconds(0);
      }

      if (time.departure_time) {
        const [hours, minutes, seconds] = time.departure_time.split(":");

        item.plannedDeparture = new Date();
        item.plannedDeparture.setHours(parseInt(hours));
        item.plannedDeparture.setMinutes(parseInt(minutes));
        item.plannedDeparture.setSeconds(parseInt(seconds ?? 0));
        item.plannedDeparture.setMilliseconds(0);
      }

      return item;
    })
    .sort(
      (a, b) => a.plannedDeparture?.getTime() - b.plannedDeparture?.getTime()
    );

  return ctx.json(properDepartures);
});

export default app;

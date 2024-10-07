import GtfsRealtimeBindings from "gtfs-realtime-bindings";
import parseCsv from "csv-simple-parser";

import { Hono } from "hono";
import type { GTFSStop } from "./types/Stop";
import type { GTFSStopTime } from "./types/StopTime";
import type { GTFSTrip } from "./types/Trip";

const app = new Hono();

const stopsData = await Bun.file("data/gtfs-nl/stops.txt").text();
const stops = parseCsv(stopsData, { header: true }) as GTFSStop[];

const stopTimesData = await Bun.file("data/gtfs-nl/stop_times.txt").text();
const stopTimes = parseCsv(stopTimesData, { header: true }) as GTFSStopTime[];

const tripUpdatesData = await Bun.file("data/tripUpdates.pb").arrayBuffer();

const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
  new Uint8Array(tripUpdatesData)
);

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

app.get("/stopTimes", async (ctx) => {
  const stop = ctx.req.query("stop");

  if (!stop) {
    return ctx.json({ error: "Missing stop query parameter" });
  }

  const times = stopTimes.filter((time) => {
    return time.stop_id === stop;
  });

  if (!times.length) return ctx.json([]);

  const trips = await Bun.file("data/gtfs-nl/trips.txt").text();
  const tripsData = parseCsv(trips, { header: true }) as GTFSTrip[];

  return ctx.json(
    times.map((time) => {
      const trip = tripsData.find((trip) => trip.trip_id === time.trip_id);
      return {
        ...time,
        trip: trip || null,
      };
    })
  );
});

export default app;

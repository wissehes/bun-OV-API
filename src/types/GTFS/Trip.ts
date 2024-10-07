export type GTFSTrip = {
  // CSV headers: route_id,service_id,trip_id,realtime_trip_id,trip_headsign,trip_short_name,trip_long_name,direction_id,block_id,shape_id,wheelchair_accessible,bikes_allowed
  route_id: string;
  service_id: string;
  trip_id: string;
  realtime_trip_id: string;
  trip_headsign: string;
  trip_short_name: string;
  trip_long_name: string;
  direction_id: string;
  block_id: string;
  shape_id: string;
  wheelchair_accessible: string;
  bikes_allowed: string;
};

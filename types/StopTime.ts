export type GTFSStopTime = {
  trip_id: string;
  stop_sequence: string;
  stop_id: string;
  stop_headsign: string | null;
  arrival_time: string;
  departure_time: string;
  pickup_type: string;
  drop_off_type: string;
  timepoint: string;
  shape_dist_traveled: string;
  fare_units_traveled: string;
};

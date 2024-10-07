export type GTFSStop = {
  stop_id: string;
  stop_code: string;
  stop_name: string;
  stop_lat: string;
  stop_lon: string;
  location_type: string;
  parent_station: string;
  stop_timezone: string;
  wheelchair_boarding: string;
  platform_code: string;
  zone_id: string;
};

export type Stop = {
  id: string;
  code: string;
  name: string;
  lat: string;
  lon: string;
  locationType: string;
  parentStation: string;
  timezone: string;
  wheelchairBoarding: string;
  platformCode: string;
  zoneId: string;
};

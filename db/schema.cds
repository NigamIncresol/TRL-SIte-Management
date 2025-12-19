using {
  cuid,
  managed
} from '@sap/cds/common';

namespace trlmonitoring;

entity SiteMaster : managed {
  key site_id               : String(100);
      customer_name         : String(100);
      location              : String(100);
      runner_id             : String(20);
      campaign_no           : String(20);
      repair_status         : String(20);
      minor_repair_status   : Integer;

      no_of_production_line : Integer;
      siteProductionLines   : Composition of many SiteProductionLine
                                on siteProductionLines.site = $self;
}

entity Campaign : managed {
  key camp_no             : String(50);
      repair_status       : String(20); // Minor / Major / Breakdown
      minor_repair_status : Integer;
      is_active           : Boolean;

      site                : Association to SiteMaster;
}

entity SiteProductionLine : cuid, managed {
  line_name            : String(100);
  no_of_spg_sensors    : Integer;
  no_of_mudgun_sensors : Integer;

  site                 : Association to SiteMaster;

  sensors              : Composition of many Sensor
                           on sensors.line = $self;


  dailyProductions     : Composition of many DailyProduction
                           on dailyProductions.productionLine = $self;
}

entity DailyProduction : cuid, managed {
  production_date          : Date;
  shift_code               : String(10); // A / B / C
  productionLine           : Association to SiteProductionLine;
  production_data          : Integer;
  erosion_data             : Integer;
  remarks                  : String(255);
  productionStageCompleted : Boolean;
  campaign_no              : String(255);
}

entity Sensor : cuid, managed {
  sensor_name   : String(100);
  sensor_type   : String(20); // Temperature / Pressure / Flow
  line          : Association to SiteProductionLine;
  site          : Association to SiteMaster;
  sensorReading : Composition of many SensorReading
                    on sensorReading.sensor = $self;
}

entity SensorReading : cuid, managed {
  reading_date         : Date;
  shift_code           : String(10); // A / B / C
  reading              : Integer;
  sensorStageCompleted : Boolean;
  sensor               : Association to Sensor;
  campaign_no          : String(255);
}

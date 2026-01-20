using {
  cuid,
  managed
} from '@sap/cds/common';

namespace trlmonitoring;

entity CustomerMaster : cuid, managed {
  customer_name : String(100);
}

entity LocationMaster : cuid, managed {
  location_name : String(100);
}

entity SiteMaster : managed {
  key site_id         : String(100);
      customer_name   : String(100);
      location        : String(100);
      runner_id       : String(20);

      productionLines : Composition of many SiteProductionLine
                          on productionLines.site = $self;
}

entity SiteProductionLine : cuid, managed {
  line_name                : String(100);
  no_of_spg_sensors        : Integer;
  no_of_mudgun_sensors     : Integer;

  curr_campaign            : String(50);
  curr_repair_status       : String(20);
  curr_minor_repair_status : Integer;

  site                     : Association to SiteMaster;

  campaigns                : Composition of many Campaign
                               on campaigns.productionLine = $self;

  sensors                  : Composition of many Sensor
                               on sensors.productionLine = $self;

  dailyProductions         : Composition of many DailyProduction
                               on dailyProductions.productionLine = $self;
}

entity Campaign : cuid, managed {
  campaign_no        : String(50);
  repair_status      : String(20);
  minor_repair_count : Integer;
  site_id            : String(100);

  start_date         : DateTime;
  end_date           : DateTime;

  isActive           : Boolean;
  Status             : String(10);

  customer_name      : String(100);
  location           : String(100);
  runner_id          : String(20);

  productionLineName : String(100);
  productionLine     : Association to SiteProductionLine;
}

entity DailyProduction : managed {
  key site_id                  : String(100);
  key productionLineName       : String(100);
  key production_date          : Date;

      productionLine           : Association to SiteProductionLine;
      curr_campaign            : String(50);
      curr_repair_status       : String(20);
      curr_minor_repair_status : Integer;
      tiltRepair               : Boolean;

      production_data          : Integer;
      erosion_data             : Integer;
      remarks                  : String(255);
      productionStageCompleted : Boolean;
}

entity Sensor : cuid, managed {
  sensor_name    : String(100);
  sensor_type    : String(20);

  productionLine : Association to SiteProductionLine;

  readings       : Composition of many SensorReading
                     on readings.sensor = $self;
}

entity SensorReading : managed {
  key site_id                  : String(100);
  key productionLineName       : String(100);
  key reading_date             : Date;
  key shift_code               : String(10);
  key sensor_name              : String(100);

      curr_campaign            : String(50);
      curr_repair_status       : String(20);
      curr_minor_repair_status : Integer;

      reading                  : Integer;
      sensorStageCompleted     : Boolean;

      sensor                   : Association to Sensor;
      productionLine           : Association to SiteProductionLine;
}

entity Inventory : managed {
  key siteId              : String(100);
  key material            : String(50);
      materialDescription : String(255);
      quantity            : Decimal(15, 3);
      batch               : String(50);
}

entity Consumption : managed {
  key site_id                  : String(100);
  key productionLineName       : String(100);
  key consumption_date         : Date;
  key shift_code               : String(10);
  key material                 : String(50);
      productionLine           : Association to SiteProductionLine;
      curr_campaign            : String(50);
      curr_repair_status       : String(20);
      curr_minor_repair_status : Integer;
      quantity                 : Decimal(15, 3);
      batch                    : String(50);
      remarks                  : String(255);
}

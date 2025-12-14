using {
    cuid,
    managed
} from '@sap/cds/common';

namespace trlmonitoring;

entity SiteMaster : cuid, managed {
    key site_id            : String(100);
    customer_name         : String(100);
    location              : String(100);
    runner_id             : String(20);
    campaign_no           : String(20);
    repair_status         : String(20);
    minor_repair_status   : Integer;
    no_of_production_line : Integer;

    siteProductionLines   : Composition of many SiteProductionLine
                                on siteProductionLines.site = $self;

    sensors               : Composition of many Sensors
                                on sensors.site = $self;
}

entity SiteProductionLine : cuid, managed {
    line_name            : String(100);
    production_data: Integer;
    errosion_data:Integer;
    no_of_spg_sensors    : Integer;
    no_of_mudgun_sensors : Integer;

    site                 : Association to one SiteMaster
                               on site.ID = site_ID;
    site_ID              : UUID;

    sensors              : Composition of many Sensors
                               on sensors.line = $self;
}

entity Sensors : cuid, managed {
    sensor_name:String(100);
    sensor_type : String(20);
    reading     : Decimal(10, 2);

    line        : Association to one SiteProductionLine
                      on line.ID = line_ID;
    line_ID     : UUID;

    site        : Association to one SiteMaster
                      on site.ID = site_ID;
    site_ID     : UUID;
}

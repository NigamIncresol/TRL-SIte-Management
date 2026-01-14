using {trlmonitoring} from '../db/schema';

service siteManagementService {
    entity customerMaster     as projection on trlmonitoring.CustomerMaster;
    entity locationMaster     as projection on trlmonitoring.LocationMaster;
    entity siteMaster         as projection on trlmonitoring.SiteMaster;

    entity siteProductionLine as projection on trlmonitoring.SiteProductionLine;

    entity campaign           as projection on trlmonitoring.Campaign;

    entity sensor             as projection on trlmonitoring.Sensor;

    entity dailyProduction    as projection on trlmonitoring.DailyProduction;

    entity sensorReading      as projection on trlmonitoring.SensorReading;

    entity consumption        as projection on trlmonitoring.Consumption;

    entity inventory          as projection on trlmonitoring.Inventory;


    /* ================= ACTIONS / FUNCTIONS ================= */
    function getCampaignsBySite(site_id: String, productionLineName: String) returns array of {
        campaign : String;
    };

    action   generateSiteId(customer_name: String,
                            location: String,
                            runner_id: String)                               returns {
        site_id : String;
    };

    function getLastCampaignNo(customer_name: String,
                               location: String,
                               runner_id: String)                            returns {
        campaign_no         : String;
        repair_status       : String;
        minor_repair_status : Integer;
        createdAt           : Timestamp;
    };

    function generateCampaignNumber(customer_name: String,
                                    location: String,
                                    runner_id: String,
                                    line_name: String)                       returns String;

    function getDailyProductionPivot(site_id: String,
                                     fromDate: Date,
                                     toDate: Date)                           returns array of {
        date      : Date;
        totalProd : Integer;
    // dynamic columns like EAST_prod, WEST_prod, EAST_erosion, etc.
    };

    function getDailyShiftSensorPivot(site_id: String,
                                      productionLineName: String,
                                      fromDate: Date,
                                      toDate: Date)                          returns array of {
        date       : Date;
        shift_code : String;
    };

    function lifeAfterMajorMinorRepairProduction(site_id: String,
                                                 productionLineName: String,
                                                 curr_campaign: String)      returns array of {
        date                : Date;
        production          : Integer;
        cumulativeprod      : Integer;
        campaign            : String;
        repair_status       : String;
        minor_repair_status : Integer;
    };

    function campaignwiseProduction(site_id: String,
                                    productionLineName: String,
                                    to_date: Date)                   returns array of {
        date                : Date;
        production          : Integer;
        cumulativeprod      : Integer;
        campaign            : String;
        repair_status       : String;
        minor_repair_status : Integer;
    };

}

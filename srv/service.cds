using { trlmonitoring } from '../db/schema.cds';

service siteManagementService {

    entity siteMaster as projection on trlmonitoring.SiteMaster;
    entity siteProductionLine as projection on trlmonitoring.SiteProductionLine;
    entity sensors as projection on trlmonitoring.Sensors;

    // Functions to generate unique IDs
    function generateSiteId() returns String;
    function generateCampaignNo() returns String;
    function generateRunnerId() returns String;

}

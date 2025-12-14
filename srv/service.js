const cds = require('@sap/cds');

module.exports = cds.service.impl(async function () {

    const { siteMaster, siteProductionLine, sensors } = this.entities;
    this.before('CREATE', 'siteMaster', async (req) => {

        if (req.data.siteProductionLines) {
            for (const line of req.data.siteProductionLines) {

                // Assign the site_ID to each sensor under this line
                if (line.sensors) {
                    for (const sensor of line.sensors) {
                        // site_ID for Sensors comes from parent SiteMaster
                        sensor.site_ID = req.data.site_id || null; // will be populated by CAP after insert
                        console.log(`Assigning site_ID to Sensor "${sensor.sensor_name}" (will be updated after insert)`);
                    }
                }
            }
        }
    });


    // ===== Function 1: generateSiteId =====
    this.on('generateSiteId', async () => {

        const last = await cds.db.run(
            SELECT.from(siteMaster)
                .columns('site_id')
                .orderBy('createdAt DESC')
                .limit(1)
        );

        let nextNo = 1;
        if (last.length && last[0].site_id) {
            const match = last[0].site_id.match(/SITE-(\d+)/);
            if (match) nextNo = parseInt(match[1], 10) + 1;
        }

        return { value: 'SITE-' + nextNo };
    });

    // ===== Function 2: generateCampaignNo =====
    this.on('generateCampaignNo', async () => {

        const last = await cds.db.run(
            SELECT.from(siteMaster)
                .columns('campaign_no')
                .orderBy('createdAt DESC')
                .limit(1)
        );

        let nextNo = 1;
        if (last.length && last[0].campaign_no) {
            const match = last[0].campaign_no.match(/CAMP-(\d+)/);
            if (match) nextNo = parseInt(match[1], 10) + 1;
        }

        return { value: 'CAMP-' + nextNo };
    });

    // ===== Function 3: generateRunnerId =====
    this.on('generateRunnerId', async () => {

        const last = await cds.db.run(
            SELECT.from(siteMaster)
                .columns('runner_id')
                .orderBy('createdAt DESC')
                .limit(1)
        );

        let nextNo = 1;
        if (last.length && last[0].runner_id) {
            const match = last[0].runner_id.match(/RUN-(\d+)/);
            if (match) nextNo = parseInt(match[1], 10) + 1;
        }

        return { value: 'RUN-' + nextNo };
    });

});

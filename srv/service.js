const cds = require('@sap/cds');

module.exports = cds.service.impl(async function () {

    const { siteMaster, campaign, siteProductionLine, sensors, dailyProduction } = this.entities;

    this.before('CREATE', 'campaign', async (req) => {

        // If campaign number already exists, allow create
        if (req.data.camp_no) return;

        // Get the latest campaign by creation timestamp
        const last = await SELECT
            .one.from(campaign)
            .columns('camp_no')
            .orderBy({ createdAt: 'desc' });  // 'createdAt' is auto-managed

        let next = 1;


        if (last?.camp_no) {
            const match = last.camp_no.match(/CAMP-(\d+)/);
            if (match) next = Number(match[1]) + 1;
        }

        req.data.camp_no = `CAMP-${next}`;

        // Optional default
        req.data.is_active ??= true;
    });

    this.before('CREATE', 'siteMaster', async (req) => {
        //
        // If site_id already provided, do NOT overwrite
        if (req.data.site_id) return;

        const { customer_name, location, runner_id } = req.data;

        if (!customer_name || !location || !runner_id) {
            req.error(400, "customer_name, location and runner_id are required");
        }

        const toCode = v =>
            v.replace(/[^a-zA-Z]/g, "").substring(0, 3).toUpperCase();

        const custCode = toCode(customer_name);
        const locCode = toCode(location);
        const runnerCode = toCode(runner_id);

        const tx = cds.transaction(req);

        for (let attempt = 0; attempt < 5; attempt++) {

            const last = await tx.run(
                SELECT.one.from(siteMaster)
                    .columns("site_id")
                    .where({ customer_name, location, runner_id })
                    .orderBy({ createdAt: "desc" })
            );

            let nextSeq = 1;
            if (last?.site_id) {
                const match = last.site_id.match(/-(\d{3})$/);
                if (match) nextSeq = Number(match[1]) + 1;
            }

            const seq = String(nextSeq).padStart(3, "0");

            req.data.site_id =
                `SITE-${custCode}-${locCode}-${runnerCode}-${seq}`;

        }


        //Managing relation
        if (req.data.siteProductionLines) {
            for (const line of req.data.siteProductionLines) {

                // Assign the site_ID to each sensor under this line
                if (line.sensors) {
                    for (const sensor of line.sensors) {
                        // site_ID for Sensors comes from parent SiteMaster
                        sensor.site_site_id = req.data.site_id || null; // will be populated by CAP after insert
                        console.log(`Assigning site_ID to Sensor "${sensor.sensor_name}" (will be updated after insert)`);
                    }
                }
            }
        }
    });

    this.on('getLastCampaignNo', async (req) => {
        const { customer_name, location, runner_id } = req.data;

        if (!customer_name || !location || !runner_id) {
            req.error(400, 'customer_name, location and runner_id are required');
        }

        const result = await SELECT
            .from(siteMaster)
            .columns(
                'campaign_no',
                'repair_status',
                'minor_repair_status',
                'createdAt'
            )
            .where({
                customer_name,
                location,
                runner_id
            })
            .orderBy({ createdAt: 'desc' })
            .limit(1);

        if (!result || result.length === 0) {
            return null;
        }

        return result[0];
    });

    this.on("generateSiteId", async (req) => {
        const { customer_name, location, runner_id } = req.data;

        if (!customer_name || !location || !runner_id) {
            req.error(400, "customer_name, location and runner_id are required");
        }

        // Convert text → 3-letter code
        const toCode = (value) =>
            value
                .replace(/[^a-zA-Z]/g, "")
                .substring(0, 3)
                .toUpperCase();

        const custCode = toCode(customer_name);
        const locCode = toCode(location);
        const runnerCode = toCode(runner_id);

        // Find last site for this combination
        const result = await SELECT
            .from(siteMaster)
            .columns("site_id")
            .where({
                customer_name,
                location,
                runner_id
            })
            .orderBy({ createdAt: "desc" })
            .limit(1);

        let nextSeq = 1;

        if (result.length && result[0].site_id) {
            const match = result[0].site_id.match(/-(\d{3})$/);
            if (match) {
                nextSeq = parseInt(match[1], 10) + 1;
            }
        }

        const seq = String(nextSeq).padStart(3, "0");

        const siteId = `SITE-${custCode}-${locCode}-${runnerCode}-${seq}`;

        return { site_id: siteId };
    });

    this.on("generateCampaignNo", async (req) => {
        const { customer_name, location, runner_id } = req.data;

        if (!customer_name || !location || !runner_id) {
            req.error(400, "customer_name, location and runner_id are required");
        }

        // Helper to convert text → 3-char code
        const toCode = (value) =>
            value
                .replace(/[^a-zA-Z]/g, "")
                .substring(0, 3)
                .toUpperCase();

        const custCode = toCode(customer_name);
        const locCode = toCode(location);
        const runnerCode = toCode(runner_id);
        // Finding last campaign for this combination
        const result = await SELECT
            .from(siteMaster)
            .columns("campaign_no")
            .where({
                customer_name,
                location,
                runner_id
            })
            .orderBy({ createdAt: "desc" })
            .limit(1);

        let nextSeq = 1;

        if (result.length && result[0].campaign_no) {
            // Extract last 3-digit sequence
            const match = result[0].campaign_no.match(/-(\d{3})$/);
            if (match) {
                nextSeq = parseInt(match[1], 10) + 1;
            }
        }

        const seq = String(nextSeq).padStart(3, "0");

        const campaignNo = `CMP-${custCode}-${locCode}-${runnerCode}-${seq}`;

        return { campaign_no: campaignNo };
    });


    this.on("submitDailyProduction", async (req) => {

        const { site_id, date } = req.data;

        if (!site_id || !date) {
            return req.error(400, "site_id and date are required");
        }

        /* =========================================
           1. Get all ProductionLine IDs for site
        ========================================= */
        const aLines = await SELECT.from(siteProductionLine)
            .columns("ID")
            .where({ site_site_id: site_id });

        if (!aLines.length) {
            return req.error(404, "No production lines found for site");
        }

        const aLineIds = aLines.map(l => l.ID);

        /* =========================================
           2. Update DailyProduction by IDs + date
        ========================================= */
        const affected = await UPDATE(dailyProduction)
            .set({ productionStageCompleted: true })
            .where({
                production_date: date,
                productionLine_ID: { in: aLineIds }
            });

        if (affected === 0) {
            return req.error(
                404,
                `No DailyProduction records found for ${site_id} on ${date}`
            );
        }

        return {
            success: true,
            message: `Daily production submitted for ${site_id} on ${date}`
        };
    });
});

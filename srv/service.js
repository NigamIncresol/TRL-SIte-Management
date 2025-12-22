const cds = require('@sap/cds');

module.exports = cds.service.impl(async function () {

    const { siteMaster, campaign, siteProductionLine, sensors, dailyProduction } = this.entities;


    this.before('CREATE', 'siteMaster', async (req) => {
        // If site_id already provided, do NOT overwrite
        if (req.data.site_id) return;

        const { customer_name, location, runner_id } = req.data;

        if (!customer_name || !location || !runner_id) {
            req.error(400, "customer_name, location and runner_id are required");
        }

        // Use FULL cleaned value (no length restriction)
        const toCode = v =>
            v
                .replace(/[^a-zA-Z0-9]/g, "") // keep letters & numbers
                .toUpperCase();

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

        // Managing relation
        if (req.data.siteProductionLines) {
            for (const line of req.data.siteProductionLines) {
                if (line.sensors) {
                    for (const sensor of line.sensors) {
                        sensor.site_site_id = req.data.site_id || null;
                        console.log(
                            `Assigning site_ID to Sensor "${sensor.sensor_name}"`
                        );
                    }
                }
            }
        }
    });
 
     this.on('generateCampaignNumber', async (req) => {

        const { customer_name, location, runner_id, line_name } = req.data;

        if (!customer_name || !location || !runner_id || !line_name) {
            req.error(
                400,
                'customer_name, location, runner_id and line_name are required'
            );
        }

        const toCode = v =>
            v
                .toString()
                .replace(/[^a-zA-Z0-9]/g, '')
                .toUpperCase();

        const custCode = toCode(customer_name);
        const locCode = toCode(location);
        const runnerCode = toCode(runner_id);
        const lineCode = toCode(line_name);

        const tx = cds.transaction(req);

        const last = await tx.run(
            SELECT.one.from(campaign)
                .columns('campaign_no')
                .where({
                    customer_name,
                    location,
                    runner_id,
                    productionLineName: line_name
                })
                .orderBy({ createdAt: 'desc' })
        );

        let nextSeq = 1;

        if (last?.campaign_no) {
            const match = last.campaign_no.match(/-(\d{3})$/);
            if (match) {
                nextSeq = Number(match[1]) + 1;
            }
        }

        const seq = String(nextSeq).padStart(3, '0');

        return `CAMP-${custCode}-${locCode}-${runnerCode}-${lineCode}-${seq}`;
    });

});


const cds = require('@sap/cds');

module.exports = cds.service.impl(async function () {

    const { siteMaster, campaign, siteProductionLine, sensor, dailyProduction, sensorReading } = this.entities;


    this.before('CREATE', 'siteMaster', async (req) => {
        // Respect manually provided site_id
        if (req.data.site_id) return;

        const { customer_name, location, runner_id } = req.data;

        if (!customer_name || !location || !runner_id) {
            req.error(400, "customer_name, location and runner_id are required");
        }

        // Normalize values
        const toCode = v =>
            v.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

        const siteId =
            `SITE-${toCode(customer_name)}-${toCode(location)}-${toCode(runner_id)}`;

        const tx = cds.transaction(req);

        // Check if combination already exists
        const existing = await tx.run(
            SELECT.one.from(siteMaster)
                .columns("site_id")
                .where({ customer_name, location, runner_id })
        );

        if (existing) {
            req.error(
                409,
                `Site already exists for this combination (site_id: ${existing.site_id})`
            );
        }

        // Assign new site_id
        req.data.site_id = siteId;

        // Propagate site_id to child entities
        if (req.data.siteProductionLines) {
            for (const line of req.data.siteProductionLines) {
                if (line.sensors) {
                    for (const sensor of line.sensors) {
                        sensor.site_site_id = siteId;
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

    //....................................................................................................................................
    this.on('getDailyProductionPivot', async (req) => {
        const { site_id, fromDate, toDate } = req.data;

        if (!site_id || !fromDate || !toDate) {
            req.error(400, "site_id, fromDate, and toDate are required");
        }

        const from = new Date(fromDate);
        const to = new Date(toDate);
        if (isNaN(from) || isNaN(to)) {
            req.error(400, "fromDate and toDate must be valid dates");
        }

        const rows = await SELECT.from(dailyProduction)
            .columns('production_date', 'productionLineName', 'production_data', 'erosion_data')
            .where({ site_id })
            .and('production_date', '>=', from)
            .and('production_date', '<=', to)
            .orderBy('production_date', 'productionLineName');

        const pivot = {};
        rows.forEach(r => {
            let dateStr;
            if (typeof r.production_date === 'string') {
                dateStr = r.production_date.split('T')[0];
            } else {
                dateStr = r.production_date.toISOString().split('T')[0];
            }

            if (!pivot[dateStr]) pivot[dateStr] = { date: dateStr, totalProd: 0 };

            pivot[dateStr][`${r.productionLineName}_prod`] =
                (pivot[dateStr][`${r.productionLineName}_prod`] || 0) + r.production_data;

            pivot[dateStr][`${r.productionLineName}_erosion`] =
                (pivot[dateStr][`${r.productionLineName}_erosion`] || 0) + r.erosion_data;

            pivot[dateStr].totalProd += r.production_data;
        });

        return Object.values(pivot);
    });

    //.....................................................................................................................................
    this.on('getDailyShiftSensorPivot', async (req) => {
        const {
            site_id,
            productionLineName,
            fromDate,
            toDate
        } = req.data;

        /** 1️⃣ Fetch sensor master */
        const sensors = await SELECT.from(sensor)
            .columns('sensor_name', 'sensor_type');

        const sensorTypeMap = {};
        for (const s of sensors) {
            // ✅ Business rule applied here
            sensorTypeMap[s.sensor_name] =
                s.sensor_type === 'SPG' ? 'OFF' : s.sensor_type;
        }

        /** 2️⃣ Fetch readings */
        const readings = await SELECT.from(sensorReading)
            .columns(
                'reading_date',
                'shift_code',
                'sensor_name',
                'reading'
            )
            .where({
                site_id,
                productionLineName,
                reading_date: { between: fromDate, and: toDate }
            });

        /** 3️⃣ Pivot */
        const pivot = {};

        for (const row of readings) {
            const key = `${row.reading_date}_${row.shift_code}`;

            if (!pivot[key]) {
                pivot[key] = {
                    date: row.reading_date,
                    shift_code: row.shift_code
                };
            }

            const sensorType = sensorTypeMap[row.sensor_name] || 'UNKNOWN';
            const col = `${row.sensor_name}_${sensorType}`;

            pivot[key][col] =
                (pivot[key][col] || 0) + row.reading;
        }

        return Object.values(pivot).sort((a, b) => {
            if (a.date === b.date) {
                return a.shift_code.localeCompare(b.shift_code);
            }
            return new Date(a.date) - new Date(b.date);
        });
    });

    //...............................................................................................................................
     this.on('getCampaignsBySite', async (req) => {

        const { site_id, productionLineName } = req.data;

        if (!site_id || !productionLineName) {
            req.reject(400, 'site_id and productionLineName are required');
        }

        // Fetch distinct campaigns filtered by both site_id and productionLineName
        const result = await cds.run(
            SELECT.distinct
                .from(dailyProduction)
                .columns('curr_campaign')
                .where({ 
                    site_id,
                    productionLineName
                })
        );

        // Map to { campaign: ... }
        return result.map(r => ({ campaign: r.curr_campaign }));
    });

    //..................................................................................................................................
     
    this.on('lifeAfterMajorMinorRepairProduction', async (req) => {

        const { site_id, productionLineName, curr_campaign } = req.data;

        if (!site_id || !productionLineName || !curr_campaign) {
            req.reject(400, 'site_id, productionLineName, and curr_campaign are required');
        }

        // Fetch production records ordered by date
        const data = await cds.run(
            SELECT.from(dailyProduction)
                .columns(
                    'production_date',
                    'production_data',
                    'curr_campaign',
                    'curr_repair_status',
                    'curr_minor_repair_status'
                )
                .where({
                    site_id,
                    productionLineName,
                    curr_campaign
                })
                .orderBy('production_date')
        );

        // Compute cumulative production with reset on minor repair status change
        let cumulative = 0;
        let prevMinorRepairStatus = null;

        const result = data.map(r => {
            const repairStatus = (r.curr_repair_status || '').toLowerCase();

            if (repairStatus === 'minor') {
                // Reset cumulative if minor repair status changes
                if (prevMinorRepairStatus !== null && r.curr_minor_repair_status !== prevMinorRepairStatus) {
                    cumulative = 0; // reset cumulative
                }
                prevMinorRepairStatus = r.curr_minor_repair_status;
            } else {
                prevMinorRepairStatus = null; // stop tracking if not minor
            }

            cumulative += r.production_data || 0;

            return {
                date: r.production_date,
                production: r.production_data || 0,
                cumulativeprod: cumulative,
                campaign: r.curr_campaign,
                repair_status: r.curr_repair_status,
                minor_repair_status: r.curr_minor_repair_status
            };
        });

        return result;
    });

    //..................................................................................................................................
     this.on('campaignwiseProduction', async (req) => {

        const { site_id, productionLineName, curr_campaign } = req.data;

        if (!site_id || !productionLineName || !curr_campaign) {
            req.reject(400, 'site_id, productionLineName, and curr_campaign are required');
        }

        // Fetch production records ordered by date
        const data = await cds.run(
            SELECT.from(dailyProduction)
                .columns(
                    'production_date',
                    'production_data',
                    'curr_campaign',
                    'curr_repair_status',
                    'curr_minor_repair_status'
                )
                .where({
                    site_id,
                    productionLineName,
                    curr_campaign
                })
                .orderBy('production_date')
        );

        // Continuous cumulative sum (no reset)
        let cumulative = 0;

        const result = data.map(r => {
            cumulative += r.production_data || 0;

            return {
                date: r.production_date,
                production: r.production_data || 0,
                cumulativeprod: cumulative,
                campaign: r.curr_campaign,
                repair_status: r.curr_repair_status,
                minor_repair_status: r.curr_minor_repair_status
            };
        });

        return result;
    });
});


const { Readable } = require('stream');
const GoogleAuth = require('google-auth-library');
const GoogleAnalyticsClient = require('./GoogleAnalyticsClient');
const moment = require('moment-timezone');
const toLower = require('lodash.tolower');
const _ = require('highland');

class GoogleAnalyticsStream extends Readable {

    constructor(config, executionDate, opts) {
        let options = opts;
        if (opts !== undefined) {
            options.objectMode = true;
        } else {
            options = {
                objectMode: true,
            };
        }
        super(options);
        this.config = config;
        this.MAX_REQUESTS = 5;
        this.internalBuffer = [];
        this.method = config.method;
        this.executionDate = moment.utc(executionDate);
        this.credentials = config.connection;
        this.client = new GoogleAnalyticsClient(this.getAuth());
        this.dimensions = [];
        this.locked = false;
        this.dataPushed = false;
        this.date = moment.tz(this.executionDate, this.config.timeZone).format('YYYY-MM-DD');
        this.dateRange = config.dateRange ? config.dateRange : [{
            startDate: this.date,
            endDate: this.date,
        }];
        if (this.config.lookUpViewIds) {
            this.idsHaveBeenLookedUp = false;
        } else {
            this.idsHaveBeenLookedUp = true;
            this.viewIds = this.config.viewIds;
        }
        this.ready = true;
    }

    /**
     * @returns [viewIds]
     */
    async lookUpAllViewIds() {
        let vIds = [];
        for (let i = 0; i < this.config.accIds.length; i += 1) {
            vIds = vIds.concat((await this.client.lookUpViewIds(this.config.accIds[i]))
                .items
                .map((item => item.id)));
        }
        return vIds;
    }

    /**
     * Pushes account summary request onto the stream.
     */
    async getAccountSummary() {
        const summaries = await this.client.getAccountSummary();
        await this.push(summaries);
        this.locked = false;
        this.get();
    }

    /**
     * Currates a list of report requests for one view id.
     * @param {vid}
     * @param {reportRequest}
     */
    async makeReportRequests(vid, reportRequest) {
        const reqs = reportRequest.map((req) => {
            const request = req;
            request.viewId = vid;
            request.dateRanges = this.dateRange;
            return req;
        });
        await this.getBatchReportGroup(reqs);
    }

    /**
     * Completes a report request and pushes it onto the stream.
     * @param {reportRequest}
     */
    async getBatchReportGroup(reportRequest) {
        let more = true;
        for (let i = 0; i < reportRequest.length; i += this.MAX_REQUESTS) {
            let req = reportRequest.slice(i, i + this.MAX_REQUESTS);
            while (more) {
                const newPage = [];
                const resp = await this.client.getBatchReport(req);
                const reports = resp.reports.map((report, index) => {
                    let rep = {};
                    rep = report;
                    if (req[index].dimensionFilterClauses !== undefined &&
                        req[index].dimensionFilterClauses !== null) {
                        rep.filters = req[index].dimensionFilterClauses[0].filters || [];
                    } else {
                        rep.filters = [];
                    }
                    rep.timeStamp = this.executionDate;
                    rep.queryLevel = this.config.queryLevel || '';
                    rep.viewId = req[index].viewId || '';
                    if (rep.data.rows === undefined || rep.data.rows === null) {
                        rep.data.rows = [];
                    }
                    if (report.nextPageToken !== undefined) {
                        const repReq = reportRequest;
                        repReq[index].pageToken = report.nextPageToken;
                        newPage.push(reportRequest[index]);
                    }
                    return rep;
                });
                req = newPage;
                if (reports.length > 0) {
                    this.internalBuffer.push(...reports);
                }
                more = req.length > 0;
            }
        }

        if (this.internalBuffer.length > 0) {
            const rows = await this.flattenReports(this.internalBuffer);
            await rows.map(async (row) => {
                await this.push(row);
            });
            this.internalBuffer = [];
            this.locked = false;
            this.get();
        }
    }

    /**
     * Takes in a report response as a stream, flattens in down into single new line deliminated
     * rows.
     * @param {stream}
     * @returns [report rows]
     */
    async flattenReports(stream) {
        this.cRows = [];
        return new Promise((resolve) => {
            _(stream).map(this.mapReportToRows.bind(this)).toArray((rows) => {
                let cRows = [];
                for (let i = 0; i < rows.length; i += 1) {
                    cRows = cRows.concat(rows[i]);
                }
                const result = this.groupBy(cRows, (item) => {
                    let arr = [item.viewid];
                    for (let l = 0; l < this.dimensions.length; l += 1) {
                        const dim = this.dimensions[l];
                        arr = arr.concat(item[dim]);
                    }
                    return arr;
                });
                const res = result.map(group =>
                                       group.reduce((acc, val) =>
                                                    Object.assign(acc, val)));
                resolve(res);
            });
        });
    }

    /**
     * Generic function that takes in an array and a function to group objects in array together.
     * @param {array}
     * @param {f}
     * @returns {array}
     */
    groupBy(array, f) {
        const groups = {};
        array.forEach((o) => {
            const group = JSON.stringify(f(o));
            groups[group] = groups[group] || [];
            groups[group].push(o);
        });
        return Object.keys(groups).map(group => groups[group]);
    }

    mapReportToRows(report) {
        let rowObj;
        let rows = [];
        if (report.data.rows !== undefined && report.data.rows !== null) {
            rows = report.data.rows.map((row) => {
                rowObj = {};
                report.columnHeader.metricHeader.metricHeaderEntries.map((entry, pos) => {
                    let entryName = toLower(entry.name);
                    if (entryName.indexOf('ga:') > -1) {
                        entryName = entryName.replace('ga:', '');
                    }
                    rowObj[entryName] = row.metrics[0].values[pos];
                    return 0;
                });
                const rcd = report.columnHeader.dimensions;
                if (rcd !== undefined && rcd !== null) {
                    rcd.map((dimension, pos) => {
                        let dimensionName = toLower(dimension);
                        if (dimensionName.indexOf('ga:') > -1) {
                            dimensionName = dimensionName.replace('ga:', '');
                        }
                        rowObj[dimensionName] = row.dimensions[pos];
                        if (this.dimensions.indexOf(dimensionName) === -1) {
                            this.dimensions.push(dimensionName);
                        }
                        return 0;
                    });
                }
                if (rowObj.date !== undefined) {
                    rowObj.timestamp = moment.tz(rowObj.date, this.TIMEZONE).format();
                }


                rowObj.viewid = report.viewId;
                rowObj.querylevel = report.queryLevel;
                return rowObj;
            });
        }
        return rows;
    }

    /**
     * Uses credentials to generate oauth2 client for Google Analytics Api.
     * @returns {oauth2 client creds}
     */
    getAuth() {
        const credentials = this.credentials;
        const auth = new GoogleAuth();
        const oauth2Client = new auth.OAuth2(credentials.client.client_id,
                                             credentials.client.client_secret,
                                             credentials.client.redirect_uris[0]);
        const creds = {
            access_token: credentials.oauth2.access_token,
            refresh_token: credentials.oauth2.refresh_token,
            token_type: credentials.oauth2.token_type,
            expiry_date: credentials.oauth2.expiry_date,
        };
        oauth2Client.credentials = creds;
        return oauth2Client;
    }

    async get() {
        if (!this.locked) {
            if (this.method === 'makeReportRequests' || this.method === undefined) {
                if (!this.idsHaveBeenLookedUp) {
                    this.viewIds = await this.lookUpAllViewIds();
                    this.idsHaveBeenLookedUp = true;
                }
                if (this.viewIds.length > 0) {
                    const vid = this.viewIds.splice(0, 1)[0];
                    this.locked = true;
                    await this.makeReportRequests(vid, this.config.reportRequest);
                } else {
                    this.push(null);
                    return;
                }
            } else if (this.method === 'getAccountSummary') {
                if (!this.dataPushed) {
                    this.locked = true;
                    this.dataPushed = true;
                    await this.getAccountSummary();
                } else {
                    this.push(null);
                    return;
                }
            }
        } else {
            return;
        }
    }

    _read() {
        this.get()
            .catch((err) => {
                process.nextTick(() => {
                    this.emit('error', err);
                });
            });
    }
}

module.exports = GoogleAnalyticsStream;

import google from 'googleapis';
import Promise from 'promise';
import moment from 'moment-timezone';
import { Activity, singleS3StreamOutput } from 'aries-data';
import authorize from './util/google_auth_helper';

const timeout = ms => new Promise(res => setTimeout(res, ms));

export default class GoogleAnalyticsSource extends Activity {
    MAX_REQUESTS = 5;
    TIME_DELAY = 3;
    allReqs = [];

    @singleS3StreamOutput('json')
    async onTask(activityTask, config, lastExecuted) {
        const currentTime = await this.utcToTimeZone(lastExecuted, config.timeZone);
        const auth = await this.getAuth(config.connection);
        const viewIds = config.lookUpViewIds ? await this.getAllAccountViewIds(config.accIds, auth) : config.viewIds;
        const req = await this.viewRequestModifier(viewIds, config.request, currentTime, config.addTimeFilters);
        const resp = await this.makeMultipleViewRequests(req, auth);
        const reports = await this.modReports(resp, currentTime, config.queryLevel);
        return reports;
    }

    async getAllAccountViewIds(accIds, auth) {
        let params = {};
        let vIds = [];
        for (let ac = 0; ac < accIds.length; ac += 1) {
            params = { accountId: accIds[ac], webPropertyId: '~all', auth };
            vIds = vIds.concat((await this.lookUpViewIds(params)).items.map((item) => { return item.id; }));
        }
        console.log(vIds);
        return vIds;
    }

    lookUpViewIds(params) {
        const service = google.analytics('v3');
        return new Promise((resolve) => {
            service.management.profiles.list(params, (err, response) => {
                if (err) {
                    console.log(`The API returned an error: ${err}`);
                    resolve(err);
                }
                resolve(response);
            });
        });
    }

    viewRequestModifier(viewIds, reqs, time, addTimeFilter) {
        let resp = [];
        for (let vc = 0; vc < viewIds.length; vc += 1) {
            resp.push(JSON.parse(JSON.stringify(this.modRequest(reqs, viewIds[vc], time, addTimeFilter))));
        }
        return resp;
    }

    modRequest(reqs, viewId, time, addTimeFilter) {
        let req = reqs;
        for (let rc = 0; rc < reqs.length; rc += 1) {
            req[rc].viewId = viewId;
        }
        if (addTimeFilter) {
            req = this.addTimeFilter(req, time);
        }
        return req;
    }

    async makeMultipleViewRequests(reqs, auth) {
        let resp = [];
        for (let i = 0; i < reqs.length; i += 1) {
            resp = resp.concat(await this.makeRequest(reqs[i], auth));
        }
        return resp;
    }

    addTimeFilter(requests, time) {
        const request = requests;
        const hr = `${time.subtract(this.TIME_DELAY, 'hour').hour()}`;
        const filter = {
            dimensionName: 'ga:hour',
            expressions: [
                hr,
            ],
        };
        let req;
        for (let i = 0; i < request.length; i += 1) {
            req = request[i];
            let filters;
            if (req.dimensionFilterClauses !== undefined && req.dimensionFilterClauses !== null) {
                filters = req.dimensionFilterClauses[0].filters;
                if (filters !== undefined && filters !== null) {
                    req.dimensionFilterClauses[0].filters.push(filter);
                } else {
                    req.dimensionFilterClauses[0].filters = [filter];
                }
            } else {
                req.dimensionFilterClauses = [{
                    filters: [
                        filter,
                    ],
                }];
            }
        }
        return request;
    }

    async makeRequest(requests, auth) {
        let resp = [];
        const reqs = requests;
        for (let i = 0; i < requests.length; i += this.MAX_REQUESTS) {
            resp = resp.concat(await this.returnReport(reqs.slice(i, i + this.MAX_REQUESTS), auth));
        }
        return resp;
    }

    async returnReport(request, auth) {
        let resp = [];
        let response = await this.requestReport(request, auth);
        console.log(JSON.stringify(response));
        if (response.errors !== undefined && response.errors[0].reason.indexOf('rateLimitExceeded') > -1) {
            await timeout(10000);
            resp = resp.concat(await this.returnReport(request, auth));
        } else {
            this.allReqs = this.allReqs.concat(request);
            resp = resp.concat(response.reports);
            let req = [];
            for (let i = 0; i < response.reports.length; i += 1) {
                if (response.reports[i].nextPageToken !== undefined) {
                    request[i]['pageToken'] = response.reports[i].nextPageToken;
                    req = req.concat(request[i]);
                }
            }
            if (req.length > 0) {
                resp = resp.concat(await this.returnReport(req, auth));
            }
        }

        return resp;
    }

    requestReport(reports, auth) {
        const rar = { reportRequests: reports };
        const service = google.analyticsreporting('v4');
        const props = { auth, resource: rar };
        return new Promise((resolve) => {
            service.reports.batchGet(props, (err, response) => {
                if (err) {
                    console.log(`The API returned an error: ${err}`);
                    resolve(err);
                }
                resolve(response);
            });
        });
    }

    getAuth(config) {
        return authorize(config);
    }

    async modReports(reports, timeStamp, queryLevel) {
        const request = this.allReqs;
        const rep = reports;
        if (request.length !== rep.length) {
            console.log('error: requests and reports must have same length');
            return 1;
        }
        let req;
        for (let i = 0; i < rep.length; i += 1) {
            req = request[i];
            if (req.dimensionFilterClauses !== undefined && req.dimensionFilterClauses !== null) {
                rep[i].filters = req.dimensionFilterClauses[0].filters || [];
            } else {
                rep[i].filters = [];
            }
            rep[i].timeStamp = timeStamp.format();
            rep[i].queryLevel = queryLevel || '';
            rep[i].viewId = req.viewId || '';
            if (rep[i].data.rows == undefined || rep[i].data.rows == null ){
                rep[i].data.rows = [];
            }

            console.log(req.dateRanges[0])
            let sd = req.dateRanges[0].startDate;
            let ed = req.dateRanges[0].endDate;    
            switch(sd) { case 'yesterday': sd = moment().add(-1, 'days'); break; case 'today': sd = moment(); break; default: sd = moment(sd) };
            switch(ed) { case 'yesterday': ed = moment().add(-1, 'days'); break; case 'today': ed = moment(); break; default: ed = moment(ed) };

            for (var m = moment(sd); m.diff(ed, 'days') <= 0; m.add(1, 'days')) {
                let ct = moment(m).format("YYYYMMDD");
                rep[i].data.rows.push({
                        dimensions: rep[i].columnHeader.dimensions.map((dim) =>  { return dim === 'ga:date' ? ct: '0';}),
                        metrics: [ {values : rep[i].columnHeader.metricHeader.metricHeaderEntries.map((met) => { return '0';})}]
                    });
            }
            rep[i].data.rowCount = rep[i].   data.rows.length;

        console.log(rep[i].data)
        }


        return rep;
    }

    utcToTimeZone(time, timeZone) {
        const currentTime = moment.utc(time);
        const newTime = moment.tz(currentTime, timeZone);
        return newTime;
    }
}

import google from 'googleapis';
import Promise from 'promise';
import moment from 'moment-timezone';
import { Activity, singleS3StreamOutput } from 'aries-data';
import authorize from './util/google_auth_helper';

const timeout = ms => new Promise(res => setTimeout(res, ms));

export default class GoogleAnalyticsSource extends Activity {
    MAX_REQUESTS = 5;
    TIME_DELAY = 3;
    @singleS3StreamOutput('json')
        async onTask(activityTask, config, lastExecuted) {
            const currentTime = await this.utcToTimeZone(lastExecuted, config.timeZone);
            let reqs = config.request;
            const auth = await this.getAuth(config.connection);
            const req = await this.viewRequestModifier(config, currentTime);
            const resp = await this.makeMultipleViewRequests(req, auth);
            config.request =  [].concat.apply([], req);
            const reports = await this.modReports(config, resp, currentTime);
            return resp;
        }

    viewRequestModifier(config, time) {
        const viewIds = config.viewIds;
        const reqs = config.request;
        let resp = [];
        for (let vc = 0; vc < viewIds.length; vc++) {
            resp.push(JSON.parse(JSON.stringify(this.modRequest(reqs, viewIds[vc], time, config))));
        }
        return resp;
    }   

    modRequest(reqs, viewId ,time, config) {
        let req = reqs;
        for (let rc = 0; rc < reqs.length; rc += 1) {
            req[rc].viewId = viewId;
        }
        if (config.addTimeFilter) {
            req = this.addTimeFilter(req, time);
        }
        return req;
    }

    async makeMultipleViewRequests(reqs, auth) {
        let resp = [];
        this.allReqs = [];
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
        console.log(response);
        if (response.errors !== undefined && response.errors[0].reason.indexOf('rateLimitExceeded') > -1) {
            await timeout(10000);
            resp = resp.concat(await this.returnReport(request, auth));
        }   
        else {
            this.allReqs = this.allReqs.concat(request);
            resp = resp.concat(response.reports)
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
        return new Promise((resolve, reject) => {
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

    async modReports(config, reports, timeStamp) {
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
            rep[i].queryLevel = config.queryLevel || '';
            rep[i].viewId = req.viewId || '';
        }

        return rep;
    }

    utcToTimeZone(time, timeZone) { 
        const currentTime = moment.utc(time);
        const newTime = moment.tz(currentTime, timeZone);
        return newTime;
    }
}

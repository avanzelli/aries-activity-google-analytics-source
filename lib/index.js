import google from 'googleapis';
import Promise from 'promise';
import moment from 'moment-timezone';
import { Activity, singleS3StreamOutput } from 'aries-data';
import authorize from './util/google_auth_helper';

export default class GoogleAnalyticsSource extends Activity {
    MAX_REQUESTS = 5;
    TIME_DELAY = 1;
    // @singleS3StreamOutput()
    async onTask(activityTask, config, lastExecuted) {
        const currentTime = await this.utcToTimeZone(lastExecuted, config.timeZone);
        let reqs = config.request;
        const auth = await this.getAuth(config);
        if (config.addTimeFilter) {
            reqs = await this.addTimeFilter(config, currentTime);
        }
        const resp = await this.makeRequest(reqs, auth);
        const reps = await this.combineReports(resp);
        const reports = await this.modReports(config, reps, currentTime);
        return reports;
    }

    async addTimeFilter(config, time) {
        const request = config.request;
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
                    req.dimensionFilterClauses.filters.push(filter);
                } else {
                    req.dimensionFilterClauses.filters = [filter];
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
        const resp = [];
        const reqs = requests;
        for (let i = 0; i < requests.length; i += this.MAX_REQUESTS) {
            resp.push(await this.requestReport(reqs.slice(i, i + this.MAX_REQUESTS), auth));
        }
        return resp;
    }

    async requestReport(reports, auth) {
        const rar = { reportRequests: reports };
        const service = google.analyticsreporting('v4');
        const props = { auth, resource: rar };
        const resp = new Promise((resolve, reject) => {
            service.reports.batchGet(props, (err, response) => {
                if (err) {
                    console.log(`The API returned an error: ${err}`);
                    reject();
                }
                resolve(response);
            });
        });
        return resp;
    }

    async getAuth(config) {
        return authorize(config);
    }

    async combineReports(reports) {
        const oldRepObj = reports;
        let newRepObj = [];
        for (let i = 0; i < oldRepObj.length; i += 1) {
            newRepObj = newRepObj.concat(oldRepObj[i].reports);
        }
        return newRepObj;
    }

    async modReports(config, reports, timeStamp) {
        const request = config.request;
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
            rep[i].timeStamp = timeStamp;
        }

        return rep;
    }

    async utcToTimeZone(time, timeZone) {
        const currentTime = moment.utc(time);
        currentTime.format();
        const newTime = moment.tz(currentTime, timeZone);
        return newTime;
    }
}

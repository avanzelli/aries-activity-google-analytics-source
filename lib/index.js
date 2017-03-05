import { Activity, singleS3StreamOutput } from 'aries-data';
var google = require('googleapis');
import authorize from './util/google_auth_helper';
import Promise from 'promise';
import moment from 'moment-timezone';

export default class GoogleAnalyticsSource extends Activity {
    MAX_REQUESTS = 3;
    TIME_DELAY = 1;
    // @singleS3StreamOutput()
    async onTask(activityTask, config, lastExecuted) {
        const auth = await this.getAuth(config);
        lastExecuted = '2017-03-03 17:00:00';
        var currentTime = await this.utcToTimeZone(lastExecuted, config.timeZone);
        var reports; 
        if(config.addTimeFilter) {
            config.request = await this.addTimeFilter(config, currentTime);
        }
        console.log(JSON.stringify(config.request));
        console.log(config.request.length);
        const reqs = config.request;
        reports = await this.makeRequest(reqs, auth);
        console.log(reqs.length);
        reports = await this.combineReports(reports);
        console.log(await this.modReports(config, reports, currentTime));
        return reports;
    };

    async addTimeFilter(config, time) {
        var req = config.request;
        var hr = time.subtract(this.TIME_DELAY, 'hour').hour() + '';
        console.log(hr);
        var filter =    {
            dimensionName: 'ga:hour',
            expressions: [
                hr
            ]
        };
        for (var i = 0; i < req.length; i++) {
            if(req[i].dimensionFilterClauses !== undefined && req[i].dimensionFilterClauses !== null ){
                if ( req[i].dimensionFilterClauses[0].filters !== undefined && req[i].dimensionFilterClauses[0].filters !== null ){
                    req[i].dimensionFilterClauses.filters.push(filter);
                }
                else {
                    req[i].dimensionFilterClauses.filters = [ filter ];    
                }
            }
            else {
                req[i].dimensionFilterClauses = [
                {
                    filters: [
                        filter
                    ]}
                ];

            }
        }

        console.log('test');
        return req;
    };

    async makeRequest(requests, auth){
        var resp = [];
        var reqs = requests;
        for (var i = 0; i < requests.length; i+= this.MAX_REQUESTS){
            console.log("i: " + i + " MRI: " + (i + this.MAX_REQUESTS));
            console.log(reqs.slice(i, i + this.MAX_REQUESTS).length);
            var report = await this.requestReport(reqs.slice(i, i + this.MAX_REQUESTS), auth);
            resp.push(report);
        }
        console.log(resp);
        return resp;
    }

    async requestReport(reports, auth) {
        var rar = { 'reportRequests': reports };
        var service = google.analyticsreporting('v4');

        var resp = new Promise(function(resolve, reject) {
            service.reports.batchGet({auth: auth,
                resource: rar
            }, function(err, resp){
                if (err) {
                    console.log('The API returned an error: ' + err);
                    reject(); 
                }
                resolve(resp);
            });
        });
        return await resp;
    }

    async getAuth(config){
        return await authorize(config);
    }

    async combineReports(reports){
        var oldRepObj = reports;
        var newRepObj = [];
        for (var i = 0; i < oldRepObj.length; i++) {
            newRepObj = newRepObj.concat(oldRepObj[i].reports);
        }
        return newRepObj;

    }

    async modReports(config, reports, timeStamp) {
        var req = config.request;
        var rep = reports;
        console.log(req.length);
        console.log(rep.length);
        if(req.length !== rep.length) {
            console.log('error: requests and reports must have same length');
            return 1;
        } 

        for (var i = 0; i < rep.length; i++) {
            rep[i].filters = req[i].dimensionFilterClauses[0].filters || [];
            rep[i].timeStamp = timeStamp;
        }

        return rep;
    };

    async utcToTimeZone(time, timeZone) {
        var currentTime  = moment.utc(time);
        currentTime.format();
        var newTime = moment.tz(currentTime, timeZone);
        return newTime;
    }
}

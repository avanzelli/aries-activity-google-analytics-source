import { assert } from 'chai';
import GoogleAnalyticsSource from '../lib/index.js';
import fs from 'fs';
import nock from 'nock';
import config from './test-config';
import moment from 'moment';
import GoogleAuth from 'google-auth-library';

describe('GoogleAnalyticsSource', () =>  {
    const GA = new GoogleAnalyticsSource();
    const time = moment().format();
    const TZ = moment.tz(time, config.timeZone);

    describe('#UTC To Time Zone', () =>  {
        it('shuld convert given time in utc to whatever timezone requested', () =>  {
            assert(GA.utcToTimeZone(time, config.timeZone).format() === TZ.format(), 'Generated Time is equal to time we know');
        }); 
    });

    describe('#Get Auth ', () =>  {
        it('shuld use util file to generate authentication for api', () =>  {
            assert(GA.getAuth(config), 'get auth should retrun oauth creds');
        });
    });

    const auth = GA.getAuth(config);

    describe('#Request Report', () =>  {
        it('should make a request to googles api and return response', () =>  {
            const requests = config.request;
            requests[0].viewId = config.viewIds[0];
            assert(GA.requestReport(requests[0], auth), 'makes a single request to googles endpoint');
        });
    });

    describe('#Add Time Filter ', () =>  {
        it('should take a list of requests and add time filters to their dimension filter clauses', () =>  {
            const resp = GA.addTimeFilter(config.request, TZ);
            assert(resp[0].dimensionFilterClauses[0].filters[0] !== undefined, 'compares added time filter');
        });
    });

    describe('#Make Requests', () =>  {
        it('should make requests to googles api and gather the results into an array', async () =>  {
            const requests = await config.request;
            requests[0].viewId = config.viewIds[0];
            const resp = await GA.makeRequest(requests,  auth);
            assert(resp[0].columnHeader !== undefined, 'There should be a response from googles api thats not undefined');
        });
        it('should make a request with the list of viewIds',async  () => {
            const resp = await GA.viewRequestModifier(config,  auth);
            assert(resp[0].columnHeader !== undefined, 'There should be a response from googles api thats not undefined');
        });
    });

    describe('#Mod Reports', () =>  {
        it('should add timestamp and request filters onto response reports for use in transform', async () =>  {
            const requests = await  GA.addTimeFilter(config.request, TZ);
            const reports = await GA.makeRequest(requests,  auth);
            const conf = {request: requests};
            const resp = await GA.modReports(conf, reports, TZ);
            assert(resp[0].timeStamp === TZ.format(), 'TimeStamp should be set');
            assert(resp[0].filters === requests[0].dimensionFilterClauses[0].filters, 'Filters should have been added');
        });
    });
});

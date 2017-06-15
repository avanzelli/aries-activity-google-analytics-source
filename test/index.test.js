import { assert } from 'chai';
import moment from 'moment';
import GoogleAnalyticsSource from '../lib/index';
import config from './test-config';

describe('GoogleAnalyticsSource', () => {
    const GA = new GoogleAnalyticsSource();
    const time = moment().format();
    const TZ = moment.tz(time, config.timeZone);

    describe('#ontask', () => {
        it('should work', async (done) => {
            console.log(await GA.onTask({}, config, TZ));
            done();
        })
    })
    describe('#UTC To Time Zone', () => {
        it('shuld convert given time in utc to whatever timezone requested', () => {
            assert(GA.utcToTimeZone(time, config.timeZone).format() === TZ.format(), 'Generated Time is equal to time we know');
        });
    });

    describe('#Get Auth ', () => {
        it('shuld use util file to generate authentication for api', () => {
            assert(GA.getAuth(config.connection), 'get auth should retrun oauth creds');
        });
    });

    const auth = GA.getAuth(config.connection);
    let viewIds = config.viewIds;
    describe('getAllViews', () => {
        it('should request all view ids', async () => {
            viewIds = await GA.getAllAccountViewIds(config.accIds, auth);
            assert(viewIds);
        });
    });

    describe('#Request Report', () => {
        it('should make a request to googles api and return response', () => {
            const requests = config.request;
            requests[0].viewId = viewIds[0];
            assert(GA.requestReport(requests[0], auth), 'makes a single request to googles endpoint');
        });
    });

    describe('#Add Time Filter ', () => {
        it('should take a list of requests and add time filters to their dimension filter clauses', () => {
            const resp = GA.addTimeFilter(config.request, TZ);
            assert(resp[0].dimensionFilterClauses[0].filters[0] !== undefined, 'compares added time filter');
        });
    });

    describe('#Make Requests', () => {
        it('should make requests to googles api and gather the results into an array', async () => {
            const requests = await config.request;
            requests[0].viewId = viewIds[0];
            console.log(requests[0].viewId);
            const resp = await GA.makeRequest(requests, auth);
            assert(resp[0].columnHeader !== undefined, 'There should be a response from googles api thats not undefined');
        });
        it('should make a request with the list of viewIds', async () => {
            const reqs = await GA.viewRequestModifier(viewIds, config.request, TZ, config.addTimeFilter);
            const resp = await GA.makeMultipleViewRequests(reqs, auth);
            assert(resp[0].columnHeader !== undefined, 'There should be a response from googles api thats not undefined');
        });
    });

    describe('#Mod Reports', () => {
        it('should add timestamp and request filters onto response reports for use in transform', async () => {
            const requests = await GA.addTimeFilter(config.request, TZ);
            const reports = await GA.makeRequest(requests, auth);
            const conf = { request: requests };
            const resp = await GA.modReports(reports, TZ, config.queryLevel);
            assert(resp[0].timeStamp === TZ.format(), 'TimeStamp should be set');
            assert(resp[0].filters === requests[0].dimensionFilterClauses[0].filters, 'Filters should have been added');
        });
    });
});

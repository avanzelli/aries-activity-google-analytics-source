import { assert } from 'chai';
import moment from 'moment';
import GoogleAnalyticsSource from '../lib/index';
import GoogleAnalyticsStream from '../lib/GoogleAnalyticsStream.js'
import config from './test-config';
import nock from 'nock';
import * as fixtures from './fixtures';

describe('GoogleAnalyticsSource', () => {

    const time = moment().format();
    const TZ = moment.tz(time, config.timeZone);

    describe('#getAccountSummary', () => {
        before(() => {
            nock('https://www.googleapis.com/analytics') 
            .get('/v3/management/accountSummaries')
            .reply(200, fixtures.accountSummary);
        });
        it('performs an account summary request', (done) => {
            config.method = 'getAccountSummary';
            const stream = new GoogleAnalyticsStream(config, time, {});
            stream.on('data', (data) => {
                //console.log(JSON.stringify(data, null, 2));
                assert.isOk(data);
            }).on('end', () => {
                done();
            });
        });
    });

    describe('#makeReportRequests', () => {
        before(() => {
            nock('https://analyticsreporting.googleapis.com/v4')
            .post('/reports:batchGet')
            .reply(200, fixtures.reportRequest);
        });
        it('performs batch report requests', (done) => {
            config.method = 'makeReportRequests';
            const stream = new GoogleAnalyticsStream(config, time, {});
            stream.on('data', (data) => {
                //console.log(JSON.stringify(data, null, 2));
                assert.isOk(data);
            }).on('end', () => {
                done();
            });
        });
    });
});

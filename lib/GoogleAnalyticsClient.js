const google = require('googleapis');
const retry = require('retry');
const PromiseThrottle = require('promise-throttle');

class GoogleAnalyticsClient {
    /**
     * @param {oauth2Client}
     */
    constructor(oauth2Client) {
        this.limiter = new PromiseThrottle({
            requestsPerSecond: 10,
            promiseImplementation: Promise,
        });
        this.auth = oauth2Client;
        this.baseConfig = {
            auth: GoogleAnalyticsClient.auth,
        };
    }

    /**
     * @param {reports}
     * @return {BatchReport}
     */
    async getBatchReport(reports) {
        const rar = { reportRequests: reports };
        const props = { auth: this.auth, resource: rar };
        return this.get(props);
    }

    /**
     * creates a rate limited promise
     * @return Promise
     */
    async get(reportRequest) {
        return this.limiter.add(this.getWithRetries.bind(this, reportRequest));
    }

    /**
     * Creates a promise that attempts a request to Google's Analytics Reporting Api
     * automatically attempts to retry on failed requests
     * @return Promise
     */
    getWithRetries(reportRequest) {
        const service = google.analyticsreporting('v4');
        return new Promise((resolve, reject) => {
            const operation = retry.operation({
                retries: 20,
                randomize: true,
            });
            operation.attempt((currentAttempt) => {
                service.reports.batchGet(reportRequest, (err, response) => {
                    if (err) {
                        console.log(err);
                        if (operation.retry(err)) {
                            return;
                        }
                        console.log(`The API returned an error: ${err} \n Current Attempt: ${currentAttempt}`);
                        reject(err);
                        return;
                    }
                    resolve(response);
                });
            });
        });
    }

    /**
     * Using the managemet api it looks up a list of viewids based of an accountid.
     * @param {id}
     */
    lookUpViewIds(id) {
        const service = google.analytics('v3');
        return new Promise((resolve, reject) => {
            const operation = retry.operation({
                retries: 20,
                randomize: true,
            });
            const params = { accountId: id, webPropertyId: '~all', auth: this.auth };
            operation.attempt((currentAttempt) => {
                service.management.profiles.list(params, (err, response) => {
                    if (err) {
                        if (operation.retry(err)) {
                            return;
                        }
                        console.log(`The API returned an error: ${err} \n Current Attempt: ${currentAttempt}`);
                        reject(err);
                        return;
                    }
                    resolve(response);
                });
            });
        });
    }

    /**
     * Using the management api looks up account summaries for the provide oauth creds.
     */
    getAccountSummary() {
        const service = google.analytics('v3');
        return new Promise((resolve, reject) => {
            const operation = retry.operation({
                retries: 20,
                randomize: true,
            });
            const params = { auth: this.auth };
            operation.attempt((currentAttempt) => {
                service.management.accountSummaries.list(params, (err, result) => {
                    if (err) {
                        if (operation.retry(err)) {
                            return;
                        }
                        console.log(`The API returned an error: ${err} \n Current Attempt: ${currentAttempt}`);
                        reject(err);
                        return;
                    }
                    resolve(result);
                });
            });
        });
    }
}

module.exports = GoogleAnalyticsClient;

import { Activity, singleS3StreamOutput } from 'aries-data';
import _ from 'highland';
import GoogleAnalyticsStream from './GoogleAnalyticsStream';

export default class GoogleAnalyticsSource extends Activity {

    @singleS3StreamOutput('json')
    async onTask(activityTask, config, executionDate) {
        return _(new GoogleAnalyticsStream(config, executionDate));
    }
}

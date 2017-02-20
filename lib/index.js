import { Activity, singleS3StreamOutput } from 'aries-data';

export default class GoogleAnalyticsSource extends Activity {

    @singleS3StreamOutput()
    async onTask(activityTask, config, lastExecuted) {
        throw new Error('onTask not implemented');
    }
}

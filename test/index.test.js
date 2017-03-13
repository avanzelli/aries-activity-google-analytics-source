import { assert } from 'chai';
import GoogleAnalyticsSource from '../lib/index.js';
import fs from 'fs';
var config = {

};

describe('GoogleAnalyticsSource', function() {
    it('should make a request', function(done) {
        const GA = new GoogleAnalyticsSource();
        GA.onTask({}, config, '2017-03-06').then( function(data) {
            console.log(data);
            var x = fs.createWriteSteam('t.json');
            x.write(data);
            done();
        });
    });
});

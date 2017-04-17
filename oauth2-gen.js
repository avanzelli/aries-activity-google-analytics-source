var GoogleAuth = require('google-auth-library');
var readline = require('readline');
var auth = new GoogleAuth();
var oauth2Client = new auth.OAuth2('140687279915-67jtr2gupb8i9olgrp94a3inoisefqlq.apps.googleusercontent.com','p1UFg_XrLYXWWkaNZMOFALRP', 'http://www.astronomer.io')
getNewToken(oauth2Client);

function getNewToken(oauth2Client) {
    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        // scope: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        scope: ['https://www.googleapis.com/auth/analytics.readonly']
    });
    console.log('Authorize this app by visiting this url: ', authUrl);
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    rl.question('Enter the code from that page here: ', (code) => {
        rl.close();
        oauth2Client.getToken(code, (err, token) => {
            if (err) {
                console.log('Error while trying to retrieve access token', err);
                return;
            }
            oauth2Client.credentials = token;
            console.log(token);
        });
    });
}   
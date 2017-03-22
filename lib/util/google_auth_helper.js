// import readline from 'readline';
import GoogleAuth from 'google-auth-library';

// // If modifying these scopes, delete your previously saved credentials
// // at ~/.credentials/admin-reports_v1-nodejs-quickstart.json
// const SCOPES = ['https://www.googleapis.com/auth/analytics.readonly'];
/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
export default function (credentials) {
    const clientSecret = credentials.client.client_secret;
    const clientId = credentials.client.client_id;
    const redirectUrl = credentials.client.redirect_uris[0];
    const auth = new GoogleAuth();
    const oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);
    const creds = { access_token: credentials.oauth2.access_token,
        refresh_token: credentials.oauth2.refresh_token,
        token_type: credentials.oauth2.token_type,
        expiry_date: credentials.oauth2.expiry_date };
    oauth2Client.credentials = creds;
    return oauth2Client;
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized
 *     client.
 */
// function getNewToken(oauth2Client, callback) {
//     const authUrl = oauth2Client.generateAuthUrl({
//         access_type: 'offline',
//         scope: SCOPES,
//     });
//     console.log('Authorize this app by visiting this url: ', authUrl);
//     const rl = readline.createInterface({
//         input: process.stdin,
//         output: process.stdout,
//     });
//     rl.question('Enter the code from that page here: ', (code) => {
//         rl.close();
//         oauth2Client.getToken(code, (err, token) => {
//             if (err) {
//                 console.log('Error while trying to retrieve access token', err);
//                 return;
//             }
//             oauth2Client.credentials = token;
//             callback(oauth2Client);
//         });
//     });
// }

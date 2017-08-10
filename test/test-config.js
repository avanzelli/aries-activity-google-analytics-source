// Uncomment for local testing: require('dotenv').config();
export default {
    addTimeFilter: false,
    timeZone: 'America/New_York',
    viewIds: ['114402148'],
    connection: {
        "client" : {
            "client_id" : 'process.env.CLIENT_ID', 
            "project_id" : 'process.env.PROJECT_ID', 
            "auth_uri" : "https://accounts.google.com/o/oauth2/auth", 
            "token_uri" : "https://accounts.google.com/o/oauth2/token", 
            "auth_provider_x509_cert_url" : "https://www.googleapis.com/oauth2/v1/certs", 
            "client_secret" : 'process.env.CLIENT_SECRET', 
            "redirect_uris" : [
                "http://www.astronomer.io"
            ]
        }, 
        "oauth2" : {
            "access_token" : 'process.env.ACCESS_TOKEN',
            "refresh_token" : 'process.env.REFRESH_TOKEN',
            "token_type" : 'process.env.TOKEN_TYPE',
            "expiry_date" : 'process.env.EXPIRY_DATE'
        }
    },
    reportRequest: [
        {
            "dimensions" : [
                {
                    "name" : "ga:date"
                }
            ], 
            "metrics" : [
                {
                    "expression" : "ga:sessions"
                }
            ],
            includeEmptyRows: true,
        }
    ]
};

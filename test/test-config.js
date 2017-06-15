require('dotenv').config();

export default {
    addTimeFilter: false,
    timeZone: 'America/New_York',
    viewIds: ['151604012'],
    connection: {
        "client" : {
            "client_id" : "140687279915-67jtr2gupb8i9olgrp94a3inoisefqlq.apps.googleusercontent.com", 
            "project_id" : "astronomer-ga-2", 
            "auth_uri" : "https://accounts.google.com/o/oauth2/auth", 
            "token_uri" : "https://accounts.google.com/o/oauth2/token", 
            "auth_provider_x509_cert_url" : "https://www.googleapis.com/oauth2/v1/certs", 
            "client_secret" : "p1UFg_XrLYXWWkaNZMOFALRP", 
            "redirect_uris" : [
                "http://www.astronomer.io"
            ]
        }, 
        "oauth2" : {
            "access_token" : "ya29.GlsrBB6Z8vYQnwsAo3-V3yw5MZiESOVkok1t_X5QPeeCCWtr4yVHc1qzvGu0GRTzt6c8NWNb4cuSvS89aUHvMVMzBqYAqZE-ruprTrFDkn9xS7J8kWN7iMK4ZtYW", 
            "refresh_token" : "1/05-9Al0voDIHYm1K66omdk4Yn_tJ92DmGNlE2KYQ4Yg", 
            "token_type" : "Bearer", 
            "expiry_date" : 1491968840950
        }    
    },
    request: [
        {
            dateRanges: [
                {
                    startDate: '2017-01-01',
                    endDate: 'yesterday',
                },
            ],
            dimensions: [
                {
                    name: 'ga:date',
                },
                {
                    name: 'ga:deviceCategory',
                },
                {
                    name: 'ga:cityId',
                },
            ],
            metrics: [
                {
                    expression: 'ga:sessions',
                },
            ],
            includeEmptyRows: true,
        },
    ],
};

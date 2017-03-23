require('dotenv').config();

export default {
    addTimeFilter: false,
    timeZone: 'America/New_York',
    viewIds: JSON.parse(process.env.VIEW_IDS),
    connection:{
        client: JSON.parse(process.env.CLIENT_CREDS),
        oauth2: JSON.parse(process.env.OAUTH2)
    },   
    request: [
    {
        "dateRanges": [
        {
            "startDate": "today",
            "endDate": "today"
        }
        ],
        "dimensions": [
        {
            "name": "ga:adwordsCreativeID"
        }
        ],
        "metrics": [
        {
            "expression": "ga:entrances"
        },
        {
            "expression": "ga:goalAbandonsAll"
        },
        {
            "expression": "ga:users"
        }
        ],
        "includeEmptyRows": true
    },
    ]
};

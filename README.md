![alt text](/img/logo.png "Aries Integration for Google Analytics")

# aries-activity-google-analytics-source

[![CircleCI](https://circleci.com/gh/aries-data/aries-activity-google-analytics-source.svg?style=svg)](https://circleci.com/gh/aries-data/aries-activity-google-analytics-source)

## Before you start 
You will need to set up your api project, enable the Google Analytics Reporting Api and generate your OAuth2 tokens. 
Follow this guide to do so - https://docs.astronomer.io/v2.0/docs/google-oauth2-tokens

Put the info from that in your config under connection like so:  
```javascript
connection:{
        "client" : {
            "client_id" : "client-id", 
            "project_id" : "project-id", 
            "auth_uri" : "https://accounts.google.com/o/oauth2/auth", 
            "token_uri" : "https://accounts.google.com/o/oauth2/token", 
            "auth_provider_x509_cert_url" : "https://www.googleapis.com/oauth2/v1/certs", 
            "client_secret" : "client-secret", 
            "redirect_uris" : [
                "http://www.astronomer.io"
            ]
        }, 
        "oauth2" : {
            "access_token" : "access-token", 
            "refresh_token" : "refresh-token", 
            "token_type" : "Bearer", 
            "expiry_date" : 1234567890
        }
    }
```
### Config

- `addTimeFilter`: boolean - set this to true if you want to add a dimension filter clause for hour. This will be set to the current hour minus a time delay of 3 hours. Defaults to false.
- `timeZone`: string - required if add time filter is set. Google's Reports' times are generated for the timezone of the viewid. This needs to be set to the timezone of that viewid. Will default to UTC. 
- `viewIds`: array[strings] - this is a list of view ids you want to run your requests for. 
- `connection`: Obj - this is your OAUTH2 credentials
- `request`: array[Obj] - this is a list of your request you want to query against the api. 

### Example config 

```javascript
    config: {
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
    }
```
### Example Response 
```javascript
{
  "reports": [
    {
      "columnHeader": {
        "dimensions": [
          "ga:adwordsCreativeID"
        ],
        "metricHeader": {
          "metricHeaderEntries": [
            {
              "name": "ga:entrances",
              "type": "INTEGER"
            },
            {
              "name": "ga:goalAbandonsAll",
              "type": "INTEGER"
            },
            {
              "name": "ga:users",
              "type": "INTEGER"
            }
          ]
        }
      },
      "data": {
        "rows": [
          {
            "dimensions": [
              "(not set)"
            ],
            "metrics": [
              {
                "values": [
                  "13",
                  "0",
                  "12"
                ]
              }
            ]
          },
          {
            "dimensions": [
              "12341234132413"
            ],
            "metrics": [
              {
                "values": [
                  "1",
                  "0",
                  "1"
                ]
              }
            ]
          }
        ],
        "totals": [
          {
            "values": [
              "14",
              "0",
              "13"
            ]
          }
        ],
        "rowCount": 2,
        "minimums": [
          {
            "values": [
              "1",
              "0",
              "1"
            ]
          }
        ],
        "maximums": [
          {
            "values": [
              "13",
              "0",
              "12"
            ]
          }
        ]
      }
    }
  ]
}
```

#### References  
- Doc's for building your request - https://developers.google.com/analytics/devguides/reporting/core/v4/rest/v4/reports/batchGet

-  Example script for obtaining OAuth2 creds - https://developers.google.com/drive/v3/web/quickstart/nodejs

## License 
MIT
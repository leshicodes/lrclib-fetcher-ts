# LRCLib API Documentation

Welcome to the beta API documentation and specification of the LRCLIB's API! Although we intend to maintain backward compatibility, please be aware that there may be breaking changes in future updates. Since this document is still in its early stages, it may lack information or contain inaccuracies in certain sections.

This API has no rate limiting in place and is openly accessible to all users and applications. There is no need for an API key or any kind of registering!

While this is not mandatory, if you are developing an application to interact with LRCLIB, we encourage you to include the User-Agent header in your requests, specifying your application's name, version, and a link to its homepage or project page. For example: `LRCGET v0.2.0 (https://github.com/tranxuanthang/lrcget).`

## Get lyrics with a track's signature
`GET /api/get`
Attempt to find the best match of lyrics for the track. You must provide the exact signature of the track, including the track title, artist name, album name, and the track's duration in seconds.

Each time you request a new track's signature, this API will attempt to access external sources in case the lyrics are not found in the internal database. Therefore, the response time will vary significantly. If you prefer to avoid this behavior, please use the `/api/get-cached` API instead.

**Note**: The provided duration is crucial. LRCLIB will attempt to provide the lyrics only when the duration matches the record in LRCLIB's database, or at least with a difference of ±2 seconds in duration.

#### Query parameters

| Field       | Required | Type   | Description                 |
|-------------|----------|--------|-----------------------------|
| track_name  | true     | string | Title of the track          |
| artist_name | true     | string | Name of the artist          |
| album_name  | true     | string | Name of the album           |
| duration    | true     | number | Track's duration in seconds |

#### Example request
`GET /api/get?artist_name=Borislav+Slavov&track_name=I+Want+to+Live&album_name=Baldur%27s+Gate+3+(Original+Game+Soundtrack)&duration=233`

#### Example response
200 OK:
```json
{
  "id": 3396226,
  "trackName": "I Want to Live",
  "artistName": "Borislav Slavov",
  "albumName": "Baldur's Gate 3 (Original Game Soundtrack)",
  "duration": 233,
  "instrumental": false,
  "plainLyrics": "I feel your breath upon my neck\n...The clock won't stop and this is what we get\n",
  "syncedLyrics": "[00:17.12] I feel your breath upon my neck\n...[03:20.31] The clock won't stop and this is what we get\n[03:25.72] "
}
```
404 Not Found: 
```json
{
  "code": 404,
  "name": "TrackNotFound",
  "message": "Failed to find specified track"
}
```

## Get lyrics with a track's signature (cached)
`GET /api/get-cached`

This API is similar to `/api/get`, except that it will only look for lyrics from internal database, and will NOT attempt to access external sources.



#### Query parameters

| Field       | Required | Type   | Description                 |
|-------------|----------|--------|-----------------------------|
| track_name  | true     | string | Title of the track          |
| artist_name | true     | string | Name of the artist          |
| album_name  | true     | string | Name of the album           |
| duration    | true     | number | Track's duration in seconds |

#### Example request
`GET /api/get-cached?artist_name=Jeremy+Soule&track_name=Dragonborn&album_name=The+Elder+Scrolls+V:+Skyrim:+Original+Game+Soundtrack&duration=236`

#### Example response
*Please see the /api/get's example response.*



## Search for lyrics records
`GET /api/search`
Search for lyrics records using keywords. This API returns an array of lyrics records that match the specified search condition(s).

At least ONE of the two parameters, `q` OR `track_name`, must be present.

**Note**: This API currently returns a maximum of 20 results and does not support pagination. These limitations are subject to change in the future.



#### Query parameters

| Field       | Required | Type   | Description                 |
|-------------|----------|--------|-----------------------------|
| track_name  | conditional     | string | Title of the track          |
| q           | conditional     | string | Search for keyword present in ANY fields (track's title, artist name or album name) |
| album_name  | false     | string | Name of the album           |
| album_name    | false     | string | Search for keyword in track's album name |

#### Example request
Search for lyrics by using only q parameter:
`GET /api/search?q=still+alive+portal`

Search for lyrics by using multiple fields:
`GET /api/search?track_name=22&artist_name=taylor+swift`



#### Example response
JSON array of the lyrics records with the following parameters: `id`, `trackName`, `artistName`, `albumName`, `duration`, `instrumental`, `plainLyrics` and `syncedLyrics`.
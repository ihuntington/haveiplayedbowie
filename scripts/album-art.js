import { Spotify } from "./spotify"
import { db } from "../service-api/src/db"

let connection;

async function main() {
    connection = await db.connect();

    const artists = await db.scrobbles.getTopArtists({
        from: "2021-01-01",
        to: "2021-12-31",
        username: "ian",
        period: "month",
        limit: 10,
    });

    // console.log(artist   s)

    const spotify = new Spotify();

    await spotify.authenticateWithClientCredentials();

    const items = await spotify.getArtists(artists.map((a) => a.spotify_id));

    console.log(items)
}

main()
    .catch((err) => {
        console.log(err)
    })
    .finally(() => {
        // console.log(connection)
        connection.done(true);
    })

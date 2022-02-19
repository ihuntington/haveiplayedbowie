# App

This is the website of Have I Played Bowie Today and runs on Node, and the front-end templates are written using Handlebars.

The back-end is written using Hapi and requests to the API service are made using local HTTP requests. There is a small amount of caching for some data from Spotify that is stored in Redis for a short period of time.

## Requirements

- Node 16
- Redis 6
- Spotify developer account

As I only periodically work on this project there are most likely partially broken features. I sometime forget what I was doing last due to the length of time that passed and I've unlikely to have made notes.

There are some references to Typescript in the `package.json` but these are from some experiments and should be removed. When I have time I will migrate the project to Typescript.

## Why Handlebars?

At the very beginning of this just a simple templating solution was required and it has since stuck. I personally don't like using Handlebars and want to replace it.

## Why Hapi?

I've preferred using it since 2014 and its plugin approach is nicer than that of Express middleware.

## TODO

- add `.env.example` file

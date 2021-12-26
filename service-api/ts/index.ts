import Hapi from "@hapi/hapi";
import type { Prisma } from "@prisma/client";
import PrismaClientPkg from "@prisma/client";

const { PrismaClient } = PrismaClientPkg;

let server: Hapi.Server;

async function start() {
    const prisma = new PrismaClient();

    server = Hapi.server({
        host: "0.0.0.0",
        port: 3000,
    });

    server.route({
        method: "GET",
        path: "/",
        options: {
            handler: async (request) => {
                // const aggregate = await prisma.scrobbles.findMany({
                //     where: {

                //     }
                // })

                const items = await prisma.scrobbles.groupBy({
                    where: {
                        AND: {
                            id: 457,
                            played_at: {
                                gte: new Date(2021, 0, 1),
                                lt: new Date(2022, 0, 1),
                            }
                        }
                    },
                    by: ["id"],
                    orderBy: {
                        _count: "desc" as any,
                    },
                    // _count: {
                    //     track_id: true,
                    // },
                    take: 5,
                })

                // const items = await prisma.artists_tracks.findMany({
                //     where: {
                //         track_id: {
                //             equals: 8513
                //         }
                //     },
                //     include: {
                //         artists: true,
                //         tracks: true,
                //     }
                // })

                // const items = await prisma.tracks.findUnique({
                //     where: {
                //         id: 8513
                //     },
                //     include: {
                //         artists_tracks: {
                //             include: {
                //                 artists: true,
                //             }
                //         }
                //     }
                // })

                // const items = await prisma.artists.findUnique({
                //     where: {
                //         id: 457,
                //     },
                //     select: {
                //         id: true,
                //         name: true,
                //         artists_tracks: {
                //             include: {
                //                 artists: {
                //                     select: {
                //                         id: true,
                //                         name: true,
                //                     }
                //                 },
                //                 tracks: {
                //                     select: {
                //                         name: true,
                //                         id: true,
                //                     }
                //                 }
                //             }
                //         }
                //     }
                // })

                return { items }

                // const count = await prisma.scrobbles.count({
                //     where: {
                //         track_id: {
                //             equals: 1002,
                //         }
                //     },
                // });

                // return { count }

                // const artists = await prisma.scrobbles.findMany({
                //     where: {
                //         track_id: {
                //             equals: 1002,
                //         }
                //     },
                //     select: {
                //         tracks: true,
                //     },
                // });

                // return { artists }
            }
        }
    });

    await server.start();
    console.log(`Server running at ${server.info.uri}`);
}

start();

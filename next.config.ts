import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      // TMDb images
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
      },
      // AniList cover images
      {
        protocol: 'https',
        hostname: 's4.anilist.co',
      },
      // MyAnimeList images
      {
        protocol: 'https',
        hostname: 'cdn.myanimelist.net',
      },
      // TVMaze images
      {
        protocol: 'https',
        hostname: 'static.tvmaze.com',
      },
      // YouTube thumbnails
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
      },
      // Imgur (sometimes used by sources)
      {
        protocol: 'https',
        hostname: 'i.imgur.com',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

export default nextConfig;

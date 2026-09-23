import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    // TMDb posters/backdrops are effectively immutable — cache optimized
    // images for 31 days so repeat views skip the optimizer entirely.
    minimumCacheTTL: 2678400,
    remotePatterns: [
      { protocol: 'https', hostname: 'image.tmdb.org' },
      { protocol: 'https', hostname: 's4.anilist.co' },
      { protocol: 'https', hostname: 'cdn.myanimelist.net' },
      { protocol: 'https', hostname: 'static.tvmaze.com' },
      { protocol: 'https', hostname: 'i.ytimg.com' },
      { protocol: 'https', hostname: '**.ytimg.com' },
      { protocol: 'https', hostname: 'img.youtube.com' },
      { protocol: 'https', hostname: 'i.imgur.com' },
      { protocol: 'https', hostname: '**.imgur.com' },
      { protocol: 'https', hostname: 'i.vimeocdn.com' },
      { protocol: 'https', hostname: '**.vimeocdn.com' },
      { protocol: 'https', hostname: 'flagcdn.com' },
      // Streaming sources posters
      { protocol: 'https', hostname: 'ia.media-imdb.com' },
      { protocol: 'https', hostname: 'm.media-amazon.com' },
      { protocol: 'https', hostname: 'archive.org' },
      { protocol: 'https', hostname: '**.archive.org' },
      { protocol: 'https', hostname: 'upload.wikimedia.org' },
      { protocol: 'https', hostname: '**.wikimedia.org' },
      { protocol: 'https', hostname: 'wikipedia.org' },
      { protocol: 'https', hostname: '**.wikipedia.org' },
      { protocol: 'https', hostname: 'www.commonsensemedia.org' },
      { protocol: 'https', hostname: 'billboard.s3.amazonaws.com' },
      { protocol: 'https', hostname: '**.crunchyroll.com' },
      { protocol: 'https', hostname: '**.pluto.tv' },
      { protocol: 'https', hostname: '**.tubi.tv' },
      { protocol: 'https', hostname: '**.plex.tv' },
      { protocol: 'https', hostname: '**.bilibili.com' },
      { protocol: 'https', hostname: '**.crackle.com' },
    ],
    unoptimized: false,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
    // Client router cache: keep dynamic-page payloads reusable for 30s so
    // revisiting / navigating back renders instantly instead of re-fetching.
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
};

export default nextConfig;

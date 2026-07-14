import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'image.tmdb.org' },
      { protocol: 'https', hostname: 's4.anilist.co' },
      { protocol: 'https', hostname: 'cdn.myanimelist.net' },
      { protocol: 'https', hostname: 'static.tvmaze.com' },
      { protocol: 'https', hostname: 'i.ytimg.com' },
      { protocol: 'https', hostname: 'i.imgur.com' },
      // Streaming sources posters
      { protocol: 'https', hostname: 'ia.media-imdb.com' },
      { protocol: 'https', hostname: 'archive.org' },
      { protocol: 'https', hostname: '**.archive.org' },
      { protocol: 'https', hostname: 'upload.wikimedia.org' },
      { protocol: 'https', hostname: '**.wikimedia.org' },
      { protocol: 'https', hostname: 'wikipedia.org' },
      { protocol: 'https', hostname: '**.wikipedia.org' },
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
  },
};

export default nextConfig;

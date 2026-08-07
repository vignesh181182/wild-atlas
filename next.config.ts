import path from 'node:path';
import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  // There is a stray lockfile in the home directory; pin the trace root here so
  // the build doesn't guess and warn.
  outputFileTracingRoot: path.join(__dirname),
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'inaturalist-open-data.s3.amazonaws.com' },
      { protocol: 'https', hostname: 'static.inaturalist.org' },
      { protocol: 'https', hostname: 'upload.wikimedia.org' },
    ],
  },
};

export default config;

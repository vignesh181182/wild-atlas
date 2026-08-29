import fs from 'node:fs';
import path from 'node:path';
import type { NextConfig } from 'next';

/**
 * What is actually deployed, decided at build time and inlined into the
 * bundle. The commit is the part that matters: the package version moves
 * rarely, and "is the thing I am looking at the thing I just pushed" is the
 * question this exists to answer. Off Vercel there is no commit to name, so
 * it says so rather than inventing one.
 */
const { version } = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'),
) as { version: string };
const commit = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7);
const APP_VERSION = commit ? `${version}+${commit}` : `${version}+dev`;

const config: NextConfig = {
  reactStrictMode: true,
  env: { APP_VERSION },
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

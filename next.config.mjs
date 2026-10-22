/** @type {import('next').NextConfig} */
const nextConfig = {
  // A static site in the "out" folder, so it can be hosted anywhere.
  output: 'export',
  // Only needed when serving from a sub-path (e.g. /eager-beaver on github.io);
  // the site is at the root of wyoballotbeaver.com.
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;

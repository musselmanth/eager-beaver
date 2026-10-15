/** @type {import('next').NextConfig} */
const nextConfig = {
  // A static site in the "out" folder, so it can be hosted anywhere.
  output: 'export',
  // Set by the GitHub Pages workflow, which serves the site from /eager-beaver.
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  // A static site in the "out" folder, so it can be hosted anywhere.
  output: 'export',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;

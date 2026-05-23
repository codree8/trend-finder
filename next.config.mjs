/** @type {import('next').NextConfig} */
const nextConfig = {
  staticPageGenerationTimeout: 120,
  experimental: {
    cpus: 1,
    workerThreads: false,
  },
};

export default nextConfig;

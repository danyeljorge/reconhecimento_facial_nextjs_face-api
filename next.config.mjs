/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Prevents double mounting webcam stream in dev mode
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      encoding: false,
    };
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      /Critical dependency: require function is used in a way in which dependencies cannot be statically extracted/,
      { module: /@vladmandic[/\\]face-api/ },
    ];
    return config;
  },
};

export default nextConfig;

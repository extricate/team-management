/** @type {import('next').NextConfig} */
const { version } = require('./package.json')

const nextConfig = {
  output: "standalone",
  serverExternalPackages: ["postgres"],
  env: {
    APP_VERSION: version,
  },
};

module.exports = nextConfig;
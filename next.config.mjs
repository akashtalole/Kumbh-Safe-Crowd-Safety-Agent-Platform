/** @type {import('next').NextConfig} */
const nextConfig = {
  // Cloudscape ships untranspiled ESM/SCSS-adjacent code that Next must transpile.
  transpilePackages: [
    '@cloudscape-design/components',
    '@cloudscape-design/component-toolkit',
    '@cloudscape-design/board-components',
  ],
}

export default nextConfig

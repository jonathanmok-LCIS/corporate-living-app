import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Corporate Living',
    short_name: 'Corp Living',
    description: 'Manage move-in and move-out for corporate living houses',
    start_url: '/login',
    display: 'standalone',
    background_color: '#f9fafb',
    theme_color: '#7c3aed',
    orientation: 'portrait',
    icons: [
      {
        src: '/icon',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}

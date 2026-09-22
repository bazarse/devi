import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Devi Mobile - POS & Management',
    short_name: 'Devi Mobile',
    description: 'All-in-One Mobile Store, Service & POS Management',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#2196f3',
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}

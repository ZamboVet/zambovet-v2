import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.zambovet.app',
  appName: 'ZamboVet',
  webDir: 'public',
  server: {
    url: process.env.CAP_SERVER_URL || 'https://zambovet-v2.vercel.app/',
    cleartext: true,
  },
};

export default config;

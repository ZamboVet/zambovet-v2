import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.zambovet.app',
  appName: 'ZamboVet',
  webDir: 'public',
  server: {
    url: 'http://192.168.254.172:3000',
    cleartext: true,
  },
};

export default config;

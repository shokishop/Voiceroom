import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.liveroomchat',
  appName: 'Live Room Chat',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;

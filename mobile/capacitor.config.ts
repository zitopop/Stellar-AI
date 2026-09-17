import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.trystellarai.stellar',
  appName: 'Stellar AI',
  webDir: 'www',
  server: {
    url: 'https://trystellarai.com/app?source=native',
    cleartext: false,
    allowNavigation: ['trystellarai.com']
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#080808',
      showSpinner: false
    },
    StatusBar: {
      overlaysWebView: true
    }
  }
};

export default config;

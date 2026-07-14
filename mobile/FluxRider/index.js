/**
 * @format
 */

import {AppRegistry} from 'react-native';
import messaging from '@react-native-firebase/messaging';
import App from './App';
import {name as appName} from './app.json';

messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('FluxRider background message:', remoteMessage?.messageId);
});

AppRegistry.registerComponent(appName, () => App);

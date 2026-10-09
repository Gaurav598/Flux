import {Alert, Linking} from 'react-native';

export const PRIVACY_POLICY_URL = 'https://gaurav598.github.io/PrivacyPolicy/';
export const SUPPORT_EMAIL = 'gr598895@gmail.com';

export const openPrivacyPolicy = async (): Promise<void> => {
  try {
    await Linking.openURL(PRIVACY_POLICY_URL);
  } catch {
    Alert.alert(
      'Unable to open Privacy Policy',
      `Please check your connection and try again. You can also visit ${PRIVACY_POLICY_URL} in your browser.`,
    );
  }
};

export const openSupportEmail = async (subject: string): Promise<void> => {
  try {
    await Linking.openURL(
      `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`,
    );
  } catch {
    Alert.alert('Support', `Email ${SUPPORT_EMAIL}`);
  }
};

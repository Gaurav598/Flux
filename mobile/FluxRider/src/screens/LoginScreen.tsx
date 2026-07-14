import React, {useState, useRef} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import auth from '@react-native-firebase/auth';
import {useDispatch} from 'react-redux';
import {loginSuccess, setLoading} from '../store/slices/authSlice';
import {AppDispatch} from '../store';
import api from '../config/api';
import {ChevronLeft} from 'lucide-react-native';
import {API_BASE_URL} from '../config/env';
import {
  TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  USER_PROFILE_KEY,
} from '../constants/storageKeys';
import {getFCMToken} from '../services/notificationService';
import {colors} from '../theme';

const LoginScreen = () => {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoadingState] = useState(false);
  const [confirmation, setConfirmation] = useState<any>(null);
  const dispatch = useDispatch<AppDispatch>();
  const otpInputRef = useRef<TextInput>(null);

  const sendOTP = async () => {
    if (!phone || phone.length !== 10) {
      Alert.alert('Error', 'Please enter a valid 10-digit phone number');
      return;
    }
    setLoadingState(true);
    try {
      const confirmationResult = await auth().signInWithPhoneNumber(
        '+91' + phone,
      );
      setConfirmation(confirmationResult);
      setOtpSent(true);
    } catch (error: any) {
      let msg = 'Failed to send OTP';
      if (error.code === 'auth/invalid-phone-number') {
        msg = 'Invalid phone number format';
      } else if (error.code === 'auth/too-many-requests') {
        msg = 'Too many requests. Please try again later';
      } else if (error.message) {
        msg = error.message;
      }
      Alert.alert('Error', msg);
    } finally {
      setLoadingState(false);
    }
  };

  const verifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit OTP');
      return;
    }
    if (!confirmation) {
      Alert.alert('Error', 'Session expired. Please send OTP again');
      return;
    }
    setLoadingState(true);
    dispatch(setLoading(true));
    try {
      const userCredential = await confirmation.confirm(otp);
      const idToken = await userCredential.user.getIdToken();
      const response = await api.post('/auth/rider/verify-firebase-token', {
        idToken,
        mobileNumber: `+91${phone}`,
        fullName: `Rider ${phone.slice(-4)}`,
      });
      const {accessToken, refreshToken, userId, fullName, profilePhotoUrl} =
        response.data;

      try {
        const fcmToken = await getFCMToken();
        if (fcmToken) {
          await api.post(
            '/user/fcm-token',
            {fcmToken},
            {
              headers: {Authorization: `Bearer ${accessToken}`},
            },
          );
        }
      } catch (fcmError) {
        console.log('FCM token registration failed:', fcmError);
      }

      const userPayload = {
        id: String(userId),
        name: fullName || `Rider ${phone.slice(-4)}`,
        phone: `+91${phone}`,
        profilePhoto: profilePhotoUrl || undefined,
        role: 'rider' as const,
      };
      await AsyncStorage.multiSet([
        [TOKEN_KEY, accessToken],
        ...(refreshToken
          ? ([[REFRESH_TOKEN_KEY, refreshToken]] as [string, string][])
          : []),
        [USER_PROFILE_KEY, JSON.stringify(userPayload)],
      ]);
      dispatch(loginSuccess({user: userPayload, accessToken}));
    } catch (error: any) {
      if (error.code === 'ERR_NETWORK' || !error.response) {
        Alert.alert(
          'Network Error',
          `Cannot connect to server at ${API_BASE_URL}.`,
        );
      } else {
        Alert.alert('Error', error.response?.data?.message || 'Login failed');
      }
    } finally {
      setLoadingState(false);
      dispatch(setLoading(false));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{flex: 1}}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.content}>
          {otpSent && (
            <TouchableOpacity
              onPress={() => {
                setOtpSent(false);
                setOtp('');
              }}
              style={styles.backBtn}>
              <ChevronLeft size={24} color={colors.textSub} />
            </TouchableOpacity>
          )}

          <View style={styles.header}>
            <Text style={styles.title}>
              {otpSent ? 'Verify OTP' : 'Captain Login'}
            </Text>
            <Text style={styles.subtitle}>
              {otpSent
                ? `Code sent to +91 ${phone}`
                : 'Enter your mobile number to continue'}
            </Text>
          </View>

          {!otpSent ? (
            <>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Mobile Number</Text>
                <View style={styles.phoneRow}>
                  <Text style={styles.countryCode}>+91</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter 10-digit number"
                    placeholderTextColor={colors.textMute}
                    keyboardType="number-pad"
                    maxLength={10}
                    value={phone}
                    onChangeText={setPhone}
                  />
                </View>
              </View>
              <TouchableOpacity
                onPress={sendOTP}
                disabled={loading}
                style={[styles.button, loading && {opacity: 0.5}]}>
                {loading ? (
                  <ActivityIndicator color={colors.onAccent} />
                ) : (
                  <Text style={styles.buttonText}>Send OTP</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Enter 6-Digit Code</Text>
                <TouchableOpacity
                  activeOpacity={1}
                  onPress={() => otpInputRef.current?.focus()}
                  style={styles.otpContainer}>
                  {Array.from({length: 6}).map((_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.otpBox,
                        otp[i] ? styles.otpBoxFilled : null,
                      ]}>
                      <Text style={styles.otpText}>{otp[i] ?? ''}</Text>
                    </View>
                  ))}
                </TouchableOpacity>
                <TextInput
                  ref={otpInputRef}
                  style={styles.hiddenInput}
                  value={otp}
                  onChangeText={setOtp}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                />
              </View>

              <TouchableOpacity
                onPress={verifyOTP}
                disabled={loading}
                style={[styles.button, loading && {opacity: 0.5}]}>
                {loading ? (
                  <ActivityIndicator color={colors.onAccent} />
                ) : (
                  <Text style={styles.buttonText}>Verify & Continue</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={sendOTP} style={styles.resendButton}>
                <Text style={styles.resendText}>
                  Didn't receive code?{' '}
                  <Text style={styles.resendLink}>Resend</Text>
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.bg},
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    paddingBottom: 40,
  },
  backBtn: {position: 'absolute', top: 20, left: 24, zIndex: 10},
  header: {marginBottom: 48},
  title: {fontSize: 32, fontWeight: '700', color: colors.text, marginBottom: 8},
  subtitle: {fontSize: 16, color: colors.textSub, lineHeight: 24},
  inputContainer: {marginBottom: 32},
  label: {fontSize: 14, fontWeight: '600', color: colors.textSub, marginBottom: 12},
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surfaceAlt,
  },
  countryCode: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    paddingLeft: 16,
    paddingRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    paddingVertical: 16,
    paddingRight: 16,
  },
  button: {
    backgroundColor: colors.accent,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {fontSize: 16, fontWeight: '600', color: colors.onAccent},
  otpContainer: {flexDirection: 'row', justifyContent: 'space-between'},
  otpBox: {
    width: 48,
    height: 56,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  otpBoxFilled: {borderColor: colors.accent, backgroundColor: colors.surfaceHigh},
  otpText: {fontSize: 24, fontWeight: '600', color: colors.text},
  hiddenInput: {position: 'absolute', opacity: 0},
  resendButton: {alignItems: 'center', marginTop: 24},
  resendText: {fontSize: 14, color: colors.textSub},
  resendLink: {color: colors.accent, fontWeight: '600'},
});

export default LoginScreen;

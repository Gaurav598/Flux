import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import {ArrowLeft} from 'lucide-react-native';
import api from '../config/api';
import {colors} from '../theme';

const OTPEntryScreen = ({route, navigation}: any) => {
  const {bookingId} = route.params;
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerifyOTP = async () => {
    if (otp.length !== 4) {
      Alert.alert('Invalid OTP', 'Please enter a 4-digit OTP');
      return;
    }

    setLoading(true);
    try {
      await api.post(`/bookings/${bookingId}/verify-otp`, null, {
        params: {otp},
      });

      Alert.alert('Success', 'Ride started! Navigate to destination.', [
        {
          text: 'OK',
          onPress: () => navigation.replace('RideTracking', {bookingId}),
        },
      ]);
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Invalid OTP. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Enter OTP</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Text style={styles.iconText}>🔐</Text>
        </View>

        <Text style={styles.title}>Verify with User</Text>
        <Text style={styles.subtitle}>
          Ask the user for the 4-digit OTP displayed on their screen
        </Text>

        <View style={styles.otpContainer}>
          <TextInput
            style={styles.otpInput}
            value={otp}
            onChangeText={text =>
              setOtp(text.replace(/[^0-9]/g, '').slice(0, 4))
            }
            keyboardType="number-pad"
            maxLength={4}
            placeholder="0000"
            placeholderTextColor={colors.textMute}
            autoFocus
          />
        </View>

        <TouchableOpacity
          style={[
            styles.verifyBtn,
            (!otp || otp.length !== 4) && styles.verifyBtnDisabled,
          ]}
          onPress={handleVerifyOTP}
          disabled={loading || !otp || otp.length !== 4}>
          {loading ? (
            <ActivityIndicator color={colors.onAccent} />
          ) : (
            <Text style={styles.verifyBtnText}>Verify & Start Ride</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.helpText}>
          The OTP ensures you're picking up the correct passenger
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    marginLeft: 15,
    color: colors.text,
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 60,
    alignItems: 'center',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  iconText: {
    fontSize: 50,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.text,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSub,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 22,
  },
  otpContainer: {
    width: '100%',
    marginBottom: 30,
  },
  otpInput: {
    width: '100%',
    height: 80,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 20,
    fontSize: 40,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 20,
    color: colors.text,
    backgroundColor: colors.surfaceAlt,
  },
  verifyBtn: {
    width: '100%',
    height: 56,
    backgroundColor: colors.accent,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  verifyBtnDisabled: {
    backgroundColor: colors.surfaceAlt,
  },
  verifyBtnText: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.onAccent,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  helpText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMute,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default OTPEntryScreen;

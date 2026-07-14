import React, {useState} from 'react';
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
  Image,
} from 'react-native';
import {launchImageLibrary} from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useDispatch, useSelector} from 'react-redux';
import {loginSuccess} from '../../../store/slices/authSlice';
import {RootState, AppDispatch} from '../../../store';
import api from '../../../config/api';
import {USER_PROFILE_KEY} from '../../../constants/storageKeys';
import {User, Camera} from 'lucide-react-native';
import {colors} from '../../../theme';

const RegisterScreen = () => {
  const dispatch = useDispatch<AppDispatch>();
  const {pendingToken, pendingUserId, pendingPhone, pendingRefreshToken} =
    useSelector((s: RootState) => s.auth);

  const [fullName, setFullName] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);

  const pickPhoto = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 800,
      maxHeight: 800,
    });
    if (!result.didCancel && result.assets && result.assets[0]?.uri) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const uploadPhoto = async (uri: string): Promise<string | null> => {
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', {
        uri,
        type: 'image/jpeg',
        name: 'profile.jpg',
      } as any);
      const response = await api.post('/upload/profile-photo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${pendingToken}`,
        },
      });
      return typeof response.data === 'string' ? response.data : null;
    } catch (e) {
      console.warn('Photo upload failed, continuing without photo');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleRegister = async () => {
    if (!fullName.trim() || fullName.trim().length < 2) {
      Alert.alert(
        'Error',
        'Please enter your full name (at least 2 characters)',
      );
      return;
    }
    setLoading(true);
    try {
      let profilePhotoUrl: string | null = null;
      if (photoUri) {
        profilePhotoUrl = await uploadPhoto(photoUri);
      }

      await api.post(
        '/user/complete-profile',
        {fullName: fullName.trim(), profilePhotoUrl: profilePhotoUrl || ''},
        {headers: {Authorization: `Bearer ${pendingToken}`}},
      );

      const userPayload = {
        id: pendingUserId!,
        name: fullName.trim(),
        phone: pendingPhone!,
        profilePhoto: profilePhotoUrl || undefined,
        role: 'user' as const,
      };

      await AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify(userPayload));
      dispatch(
        loginSuccess({
          user: userPayload,
          token: pendingToken!,
          refreshToken: pendingRefreshToken || undefined,
        }),
      );
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Registration failed',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{flex: 1}}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.content}>
          <Text style={styles.title}>Complete Profile</Text>
          <Text style={styles.subtitle}>
            Just a few details to get you started
          </Text>

          {/* Profile Photo */}
          <TouchableOpacity onPress={pickPhoto} style={styles.photoContainer}>
            {photoUri ? (
              <Image source={{uri: photoUri}} style={styles.photo} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <User size={48} color={colors.textMute} />
              </View>
            )}
            <View style={styles.cameraBtn}>
              <Camera size={18} color={colors.onAccent} />
            </View>
          </TouchableOpacity>
          <Text style={styles.photoHint}>
            Tap to add profile photo (optional)
          </Text>

          {/* Full Name */}
          <View style={styles.inputWrapper}>
            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your full name"
              placeholderTextColor={colors.textMute}
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              autoFocus
            />
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>📱 Mobile: {pendingPhone}</Text>
          </View>

          <TouchableOpacity
            onPress={handleRegister}
            disabled={loading || uploading}
            style={[styles.btn, (loading || uploading) && {opacity: 0.6}]}>
            {loading || uploading ? (
              <ActivityIndicator color={colors.onAccent} />
            ) : (
              <Text style={styles.btnText}>
                {uploading ? 'Uploading...' : 'GET STARTED'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.bg},
  content: {flex: 1, paddingHorizontal: 28, justifyContent: 'center'},
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: colors.textMute,
    fontWeight: '600',
    marginBottom: 40,
    textAlign: 'center',
  },
  photoContainer: {alignSelf: 'center', marginBottom: 8, position: 'relative'},
  photo: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 4,
    borderColor: colors.accent,
  },
  photoPlaceholder: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBtn: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: colors.accent,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.bg,
  },
  photoHint: {
    textAlign: 'center',
    color: colors.textMute,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 32,
  },
  inputWrapper: {marginBottom: 16},
  label: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.textSub,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: 20,
    paddingVertical: 18,
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  infoBox: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoText: {fontSize: 15, color: colors.textSub, fontWeight: '700'},
  btn: {
    backgroundColor: colors.accent,
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  btnText: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.onAccent,
    letterSpacing: 1,
  },
});

export default RegisterScreen;

import React, {useCallback, useEffect, useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  SafeAreaView,
  StyleSheet,
  Modal,
  useWindowDimensions,
  TextInput,
  Linking,
  Image,
} from 'react-native';
import {useSelector, useDispatch} from 'react-redux';
import {RootState, AppDispatch} from '../store';
import {logout} from '../store/slices/authSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CreditCard,
  Bell,
  HelpCircle,
  LogOut,
  ChevronRight,
  Bike,
  ShieldCheck,
  Edit3,
  CheckCircle2,
} from 'lucide-react-native';
import {useNavigation} from '@react-navigation/native';
import api from '../config/api';
import {colors, getVehicleImage, normalizeVehicleId} from '../theme';
import CardGradient from '../components/CardGradient';

const RIDER_VEHICLE_TYPES = [
  {id: 'bike', label: 'Bike', desc: 'Two-wheeler rides'},
  {id: 'auto', label: 'Auto', desc: 'Auto rickshaw rides'},
  {id: 'cab', label: 'Cab', desc: 'Car ride requests'},
];

const ProfileScreen = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<any>();
  const {width} = useWindowDimensions();
  const {user} = useSelector((state: RootState) => state.auth);

  const [profile, setProfile] = useState<any>(null);
  const [editVisible, setEditVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    vehicleType: '',
    vehicleModel: '',
    vehicleRegistrationNumber: '',
  });

  const loadProfile = useCallback(async () => {
    try {
      const response = await api.get('/rider/profile');
      const rider = response.data;
      setProfile(rider);
      setForm({
        fullName: rider?.user?.fullName || user?.fullName || '',
        vehicleType: rider?.vehicleType || '',
        vehicleModel: rider?.vehicleModel || '',
        vehicleRegistrationNumber: rider?.vehicleRegistrationNumber || '',
      });
    } catch {
      // ignore
    }
  }, [user?.fullName]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout from Captain account?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.clear();
            dispatch(logout());
          },
        },
      ],
    );
  };

  const handleSaveProfile = async () => {
    if (!form.fullName.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }
    setSaving(true);
    try {
      await api.patch('/rider/profile', {
        fullName: form.fullName,
        vehicleType: form.vehicleType,
        vehicleModel: form.vehicleModel,
        vehicleRegistrationNumber: form.vehicleRegistrationNumber,
      });
      setEditVisible(false);
      await loadProfile();
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to update profile',
      );
    } finally {
      setSaving(false);
    }
  };

  const vehicleId = normalizeVehicleId(
    profile?.vehicleType || form.vehicleType,
  );

  const menuItems = [
    {
      icon: Bike,
      label: 'Vehicle & KYC Documents',
      color: colors.accent,
      screen: 'Documents',
    },
    {
      icon: CreditCard,
      label: 'Earnings & Payouts',
      color: colors.success,
      screen: 'Earnings',
    },
    {
      icon: Bell,
      label: 'Notifications',
      color: colors.warning,
      screen: 'Notifications',
    },
    {
      icon: HelpCircle,
      label: 'Help & Support',
      color: colors.info,
      screen: null,
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <CardGradient radius={30} />
          <View style={styles.avatarWrapper}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(profile?.user?.fullName || user?.fullName || 'C')
                  .charAt(0)
                  .toUpperCase()}
              </Text>
            </View>
            <View style={styles.verifiedBadge}>
              <ShieldCheck size={16} color={colors.onAccent} />
            </View>
          </View>

          <Text style={styles.name}>
            {profile?.user?.fullName || user?.fullName || 'Flux Captain'}
          </Text>
          <Text style={styles.phoneText}>
            {profile?.user?.mobileNumber || user?.mobileNumber || ''}
          </Text>

          <View style={styles.vehicleCard}>
            <CardGradient radius={16} />
            <Image
              source={getVehicleImage(vehicleId)}
              style={styles.vehicleImage}
              resizeMode="contain"
            />
            <View style={styles.vehicleTextWrap}>
              <Text style={styles.vehicleTitle}>Vehicle Details</Text>
              <Text style={styles.vehicleLine}>
                {profile?.vehicleType || 'Type not set'}
              </Text>
              <Text style={styles.vehicleLine}>
                {profile?.vehicleModel || 'Model not set'}
              </Text>
              <Text style={styles.vehicleLine}>
                {profile?.vehicleRegistrationNumber || 'Registration not set'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => setEditVisible(true)}>
            <Edit3 size={16} color={colors.onAccent} />
            <Text style={styles.editBtnText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Account Settings</Text>

          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              activeOpacity={0.7}
              onPress={async () => {
                if (item.screen) {
                  navigation.navigate(item.screen);
                  return;
                }
                const mail =
                  'mailto:support@flux.app?subject=Flux Rider Support';
                const canOpen = await Linking.canOpenURL(mail);
                if (canOpen) {
                  await Linking.openURL(mail);
                } else {
                  Alert.alert('Support', 'Email support@flux.app');
                }
              }}
              style={styles.menuItem}>
              <CardGradient radius={18} />
              <View
                style={[styles.menuIcon, {backgroundColor: `${item.color}15`}]}>
                <item.icon size={20} color={item.color} strokeWidth={2.5} />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <ChevronRight size={18} color={colors.textMute} strokeWidth={3} />
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleLogout}
            style={styles.logoutBtn}>
            <View style={styles.logoutIcon}>
              <LogOut size={20} color={colors.danger} strokeWidth={2.5} />
            </View>
            <Text style={styles.logoutText}>Sign Out</Text>
            <ChevronRight size={18} color={colors.danger} strokeWidth={3} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal visible={editVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Rider Profile</Text>
            <TextInput
              style={styles.input}
              value={form.fullName}
              onChangeText={fullName => setForm(prev => ({...prev, fullName}))}
              placeholder="Full name"
              placeholderTextColor={colors.textMute}
            />
            <Text style={styles.vehiclePickerLabel}>Vehicle type</Text>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.vehiclePickerCarousel}
              snapToInterval={width - 72}
              decelerationRate="fast">
              {RIDER_VEHICLE_TYPES.map(option => {
                const selected =
                  normalizeVehicleId(form.vehicleType) === option.id;
                return (
                  <TouchableOpacity
                    key={option.id}
                    activeOpacity={0.9}
                    style={[
                      styles.vehicleTypeHeroCard,
                      {width: width - 72},
                      selected && styles.vehicleTypeHeroCardActive,
                    ]}
                    onPress={() =>
                      setForm(prev => ({...prev, vehicleType: option.label}))
                    }>
                    <View style={styles.vehicleTypeGlow} />
                    <Image
                      source={getVehicleImage(option.id)}
                      style={styles.vehicleTypeHeroImage}
                      resizeMode="contain"
                    />
                    <View style={styles.vehicleTypeHeroTextWrap}>
                      <Text style={styles.vehicleTypeHeroTitle}>
                        {option.label}
                      </Text>
                      <Text style={styles.vehicleTypeHeroSubtitle}>
                        {option.desc}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TextInput
              style={styles.input}
              value={form.vehicleModel}
              onChangeText={vehicleModel =>
                setForm(prev => ({...prev, vehicleModel}))
              }
              placeholder="Vehicle model"
              placeholderTextColor={colors.textMute}
            />
            <TextInput
              style={styles.input}
              value={form.vehicleRegistrationNumber}
              onChangeText={vehicleRegistrationNumber =>
                setForm(prev => ({...prev, vehicleRegistrationNumber}))
              }
              placeholder="Registration number"
              autoCapitalize="characters"
              placeholderTextColor={colors.textMute}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setEditVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveProfile}>
                {saving ? (
                  <CheckCircle2 size={16} color={colors.onAccent} />
                ) : (
                  <Text style={styles.saveBtnText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.bg},
  content: {flex: 1},
  header: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 24,
    backgroundColor: 'transparent',
    overflow: 'hidden',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  avatarWrapper: {position: 'relative', marginBottom: 14},
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 30,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {fontSize: 36, fontWeight: '900', color: colors.accent},
  verifiedBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: colors.accent,
    padding: 5,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  name: {fontSize: 24, fontWeight: '900', color: colors.text},
  phoneText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSub,
    marginTop: 5,
  },
  vehicleCard: {
    marginTop: 12,
    backgroundColor: 'transparent',
    overflow: 'hidden',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minWidth: '82%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  vehicleImage: {width: 74, height: 58, marginRight: 12},
  vehicleTextWrap: {flex: 1},
  vehicleTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.textMute,
    textTransform: 'uppercase',
  },
  vehicleLine: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginTop: 2,
  },
  editBtn: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  editBtnText: {marginLeft: 6, color: colors.onAccent, fontWeight: '800'},
  menuSection: {paddingHorizontal: 18, marginTop: 20, marginBottom: 34},
  sectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.textMute,
    marginBottom: 14,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    overflow: 'hidden',
    padding: 14,
    borderRadius: 18,
    marginBottom: 10,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuLabel: {flex: 1, fontSize: 15, fontWeight: '800', color: colors.text},
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerSoft,
    padding: 14,
    borderRadius: 18,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  logoutIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  logoutText: {flex: 1, fontSize: 15, fontWeight: '800', color: colors.danger},
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.text,
    marginBottom: 10,
  },
  vehiclePickerLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.textMute,
    marginTop: 12,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  vehiclePickerCarousel: {
    paddingVertical: 2,
  },
  vehicleTypeHeroCard: {
    height: 136,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  vehicleTypeHeroCardActive: {
    borderColor: 'rgba(255,255,255,0.42)',
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  vehicleTypeGlow: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(255,255,255,0.14)',
    left: -36,
    top: -26,
  },
  vehicleTypeHeroImage: {width: 128, height: 96, marginRight: 12},
  vehicleTypeHeroTextWrap: {flex: 1, minWidth: 0},
  vehicleTypeHeroTitle: {fontSize: 23, fontWeight: '900', color: colors.text},
  vehicleTypeHeroSubtitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSub,
    marginTop: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginTop: 10,
    color: colors.text,
    fontWeight: '700',
    backgroundColor: colors.surfaceAlt,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 14,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.surfaceAlt,
    marginRight: 8,
  },
  cancelBtnText: {fontWeight: '800', color: colors.text},
  saveBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.accent,
    minWidth: 68,
    alignItems: 'center',
  },
  saveBtnText: {fontWeight: '800', color: colors.onAccent},
});

export default ProfileScreen;

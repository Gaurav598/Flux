import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  SafeAreaView,
  Image,
  Linking,
} from 'react-native';
import {useSelector, useDispatch} from 'react-redux';
import {RootState, AppDispatch} from '../store';
import {logout} from '../store/slices/authSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  MapPin,
  Bell,
  HelpCircle,
  LogOut,
  ChevronRight,
  Settings,
} from 'lucide-react-native';
import {useNavigation} from '@react-navigation/native';
import {colors} from '../theme';
import CardGradient from '../components/CardGradient';

const ProfileScreen = () => {
  const dispatch = useDispatch<AppDispatch>();
  const {user} = useSelector((state: RootState) => state.auth);
  const navigation = useNavigation<any>();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.clear();
          dispatch(logout());
        },
      },
    ]);
  };

  const menuItems = [
    {
      icon: MapPin,
      label: 'My Bookings',
      color: colors.info,
      onPress: () => navigation.navigate('MyBookings'),
    },
    {
      icon: Bell,
      label: 'Notifications',
      color: colors.accent,
      onPress: () => navigation.navigate('Notifications'),
    },
    {
      icon: Settings,
      label: 'Settings',
      color: colors.textSub,
      onPress: () =>
        Alert.alert(
          'Settings',
          'App settings will be expanded in the next update.',
        ),
    },
    {
      icon: HelpCircle,
      label: 'Help & Support',
      color: '#8B5CF6',
      onPress: async () => {
        const mail = 'mailto:support@flux.app?subject=Flux Support Request';
        const canOpen = await Linking.canOpenURL(mail);
        if (canOpen) {
          await Linking.openURL(mail);
        } else {
          Alert.alert('Support', 'Email support@flux.app');
        }
      },
    },
  ];

  return (
    <SafeAreaView className="flex-1" style={{backgroundColor: colors.bg}}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <View
          className="px-6 pt-10 pb-12 items-center rounded-b-[50px] overflow-hidden"
          style={{backgroundColor: 'transparent'}}>
          <CardGradient radius={50} />
          <View className="relative">
            {user?.profilePhoto ? (
              <Image
                source={{uri: user.profilePhoto}}
                className="w-28 h-28 rounded-[40px]"
                style={{width: 112, height: 112, borderRadius: 40}}
              />
            ) : (
              <View
                className="w-28 h-28 rounded-[40px] items-center justify-center shadow-2xl"
                style={{backgroundColor: colors.accent}}>
                <Text
                  className="text-4xl font-black"
                  style={{color: colors.onAccent}}>
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </Text>
              </View>
            )}
            <TouchableOpacity
              className="absolute -bottom-2 -right-2 p-3 rounded-2xl border-4"
              style={{
                backgroundColor: colors.surfaceHigh,
                borderColor: colors.bg,
              }}
              onPress={() => navigation.navigate('Notifications')}>
              <Settings size={18} color={colors.text} />
            </TouchableOpacity>
          </View>

          <Text
            className="text-3xl font-black mt-6"
            style={{color: colors.text}}>
            {user?.name || 'Flux User'}
          </Text>
          <View
            className="px-4 py-2 rounded-2xl mt-3 border"
            style={{
              backgroundColor: colors.surfaceAlt,
              borderColor: colors.border,
            }}>
            <Text
              className="text-sm font-black uppercase tracking-widest"
              style={{color: colors.textMute}}>
              {user?.phone || '+91 00000 00000'}
            </Text>
          </View>
        </View>

        {/* Menu Section */}
        <View className="px-6 py-10">
          <Text
            className="text-xs font-black uppercase tracking-widest mb-6 ml-1"
            style={{color: colors.textMute}}>
            Account Overview
          </Text>

          <View className="space-y-4">
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                activeOpacity={0.7}
                onPress={item.onPress}
                className="flex-row items-center p-5 rounded-3xl shadow-sm mb-4 overflow-hidden"
                style={{
                  backgroundColor: 'transparent',
                }}>
                <CardGradient radius={24} />
                <View
                  className="p-3 rounded-2xl mr-4"
                  style={{backgroundColor: `${item.color}15`}}>
                  <item.icon size={22} color={item.color} strokeWidth={2.5} />
                </View>
                <Text
                  className="flex-1 text-lg font-black"
                  style={{color: colors.text}}>
                  {item.label}
                </Text>
                <ChevronRight
                  size={20}
                  color={colors.textMute}
                  strokeWidth={3}
                />
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleLogout}
              className="flex-row items-center border p-5 rounded-3xl mt-6"
              style={{
                backgroundColor: colors.dangerSoft,
                borderColor: colors.danger,
              }}>
              <View
                className="p-3 rounded-2xl mr-4"
                style={{backgroundColor: colors.dangerSoft}}>
                <LogOut size={22} color={colors.danger} strokeWidth={2.5} />
              </View>
              <Text
                className="flex-1 text-lg font-black"
                style={{color: colors.danger}}>
                Logout Session
              </Text>
              <ChevronRight size={20} color={colors.danger} strokeWidth={3} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer info */}
        <View className="items-center pb-12">
          <Text
            className="text-[10px] font-black uppercase tracking-[4px]"
            style={{color: colors.textFaint}}>
            FLUX v1.0.1
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ProfileScreen;

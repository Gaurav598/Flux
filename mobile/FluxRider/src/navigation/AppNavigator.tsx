import React, {useEffect} from 'react';
import {View, Text, StyleSheet, Platform} from 'react-native';
import {
  NavigationContainer,
  createNavigationContainerRef,
} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {useSelector} from 'react-redux';
import {RootState} from '../store';
import {Home, ListOrdered, Wallet, User} from 'lucide-react-native';
import {colors} from '../theme';

import {
  NotificationProvider,
  useNotification,
} from '../context/NotificationContext';
import {setupNotificationListeners} from '../services/notificationService';
import PopupNotifications from '../components/PopupNotifications';
import api from '../config/api';

import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import AvailableBookingsScreen from '../screens/AvailableBookingsScreen';
import MyBidsScreen from '../screens/MyBidsScreen';
import EarningsScreen from '../screens/EarningsScreen';
import DocumentsScreen from '../screens/DocumentsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import RideTrackingScreen from '../screens/RideTrackingScreen';
import OTPEntryScreen from '../screens/OTPEntryScreen';
import ChatScreen from '../screens/ChatScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const navigationRef = createNavigationContainerRef<any>();

const handleRiderNotificationOpen = async (remoteMessage: any) => {
  const data = remoteMessage?.data || {};
  const bookingId = String(data.bookingId || '').trim();
  const type = String(data.type || '').toUpperCase();

  if (!navigationRef.isReady()) {
    return;
  }

  if (bookingId) {
    if (type === 'NEW_BOOKING') {
      navigationRef.resetRoot({index: 0, routes: [{name: 'AvailableBookings'}]});
      return;
    }

    navigationRef.resetRoot({
      index: 0,
      routes: [{name: 'RideTracking', params: {bookingId: Number(bookingId)}}],
    });
    return;
  }

  navigationRef.resetRoot({index: 0, routes: [{name: 'Notifications'}]});
};

const TabIcon = ({
  icon: Icon,
  focused,
  label,
}: {
  icon: any;
  focused: boolean;
  label: string;
}) => (
  <View style={styles.tabIconContainer}>
    <View style={[styles.iconWrapper, focused && styles.iconWrapperActive]}>
      <Icon
        size={22}
        color={focused ? colors.text : colors.textMute}
        strokeWidth={focused ? 2.5 : 2}
      />
    </View>
    <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>
      {label}
    </Text>
  </View>
);

const HomeTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: styles.tabBar,
      }}>
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          tabBarIcon: ({focused}) => (
            <TabIcon icon={Home} focused={focused} label="Home" />
          ),
        }}
      />
      <Tab.Screen
        name="BookingsTab"
        component={AvailableBookingsScreen}
        options={{
          tabBarIcon: ({focused}) => (
            <TabIcon icon={ListOrdered} focused={focused} label="Orders" />
          ),
        }}
      />
      <Tab.Screen
        name="EarningsTab"
        component={EarningsScreen}
        options={{
          tabBarIcon: ({focused}) => (
            <TabIcon icon={Wallet} focused={focused} label="Earnings" />
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({focused}) => (
            <TabIcon icon={User} focused={focused} label="Profile" />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const NavigationContent = () => {
  const {showNotification} = useNotification();
  const {isAuthenticated, loading} = useSelector(
    (state: RootState) => state.auth,
  );

  const shouldShowPopup = (remoteMessage: any) => {
    const notifType = String(remoteMessage?.data?.type || '').toUpperCase();
    return notifType !== 'OTP_READY' && notifType !== 'RIDER_ARRIVED';
  };

  useEffect(() => {
    const unsubscribe = setupNotificationListeners(
      remoteMessage => {
        if (!shouldShowPopup(remoteMessage)) {
          return;
        }
        showNotification({
          title: remoteMessage.notification?.title || 'New Notification',
          body: remoteMessage.notification?.body || '',
          type: 'info',
          data: remoteMessage.data,
          onPress: () => {
            handleRiderNotificationOpen(remoteMessage);
          },
        });
      },
      remoteMessage => {
        handleRiderNotificationOpen(remoteMessage);
      },
    );

    return () => unsubscribe();
  }, [showNotification]);

  if (loading) {
    return null;
  }

  return (
    <>
      <PopupNotifications />
      <Stack.Navigator screenOptions={{headerShown: false}}>
        {!isAuthenticated ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            <Stack.Screen name="Home" component={HomeTabs} />
            <Stack.Screen
              name="AvailableBookings"
              component={AvailableBookingsScreen}
              options={{headerShown: false}}
            />
            <Stack.Screen
              name="MyBids"
              component={MyBidsScreen}
              options={{headerShown: false}}
            />
            <Stack.Screen
              name="Earnings"
              component={EarningsScreen}
              options={{headerShown: false}}
            />
            <Stack.Screen
              name="Documents"
              component={DocumentsScreen}
              options={{headerShown: false}}
            />
            <Stack.Screen
              name="Notifications"
              component={NotificationsScreen}
              options={{headerShown: false}}
            />
            <Stack.Screen
              name="RideTracking"
              component={RideTrackingScreen}
              options={{headerShown: false}}
            />
            <Stack.Screen
              name="OTPEntry"
              component={OTPEntryScreen}
              options={{headerShown: false}}
            />
            <Stack.Screen
              name="Chat"
              component={ChatScreen}
              options={{headerShown: false}}
            />
          </>
        )}
      </Stack.Navigator>
    </>
  );
};

const AppNavigator = () => {
  return (
    <NavigationContainer ref={navigationRef}>
      <NotificationProvider>
        <NavigationContent />
      </NotificationProvider>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    height: Platform.OS === 'ios' ? 88 : 70,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 28 : 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -4},
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 20,
  },
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    width: 44,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    marginBottom: 4,
  },
  iconWrapperActive: {
    backgroundColor: colors.accentSoft,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMute,
    letterSpacing: 0.3,
  },
  tabLabelActive: {
    color: colors.text,
    fontWeight: '800',
  },
});

export default AppNavigator;

import React, {useEffect} from 'react';
import {useSelector} from 'react-redux';
import {
  NavigationContainer,
  createNavigationContainerRef,
} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {RootState} from '../store';
import {
  NotificationProvider,
  useNotification,
} from '../context/NotificationContext';
import {setupNotificationListeners} from '../services/notificationService';
import PopupNotifications from '../components/PopupNotifications';
import api from '../config/api';

import LoginScreen from '../features/auth/screens/LoginScreen';
import RegisterScreen from '../features/auth/screens/RegisterScreen';
import UserHomeScreen from '../features/user/screens/HomeScreen';
import SelectRideScreen from '../features/user/screens/SelectRideScreen';
import SetPriceScreen from '../features/user/screens/SetPriceScreen';
import BidsScreen from '../features/user/screens/BidsScreen';
import TrackingScreen from '../features/user/screens/TrackingScreen';
import ChatScreen from '../features/user/screens/ChatScreen';
import ProfileScreen from '../screens/ProfileScreen';
import MyBookingsScreen from '../screens/MyBookingsScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import BookingScreen from '../screens/BookingScreen';
import BidSelectionScreen from '../screens/BidSelectionScreen';
import ActiveBookingScreen from '../screens/ActiveBookingScreen';
import RiderApproachingScreen from '../screens/RiderApproachingScreen';
import RatingScreen from '../screens/RatingScreen';

const Stack = createNativeStackNavigator();
const navigationRef = createNavigationContainerRef<any>();

const routeUserByBooking = async (bookingId: string) => {
  if (!bookingId || !navigationRef.isReady()) {
    return;
  }

  try {
    const response = await api.get(`/bookings/${bookingId}`);
    const booking = response.data;
    const status = String(booking?.status || '').toUpperCase();

    if (status === 'RIDER_ARRIVED') {
      navigationRef.resetRoot({
        index: 0,
        routes: [{name: 'UserTracking', params: {rideId: String(bookingId)}}],
      });
      return;
    }
    if (status === 'IN_PROGRESS') {
      navigationRef.resetRoot({
        index: 0,
        routes: [{name: 'ActiveBooking', params: {bookingId: Number(bookingId)}}],
      });
      return;
    }
    if (status === 'COMPLETED') {
      navigationRef.resetRoot({
        index: 0,
        routes: [{name: 'RatingScreen', params: {bookingId: Number(bookingId)}}],
      });
      return;
    }
    if (status === 'ACCEPTED' || status === 'RIDER_EN_ROUTE') {
      navigationRef.resetRoot({
        index: 0,
        routes: [{name: 'UserTracking', params: {rideId: String(bookingId)}}],
      });
      return;
    }

    navigationRef.resetRoot({
      index: 0,
      routes: [{name: 'UserBids', params: {rideId: String(bookingId)}}],
    });
  } catch {
    navigationRef.resetRoot({index: 0, routes: [{name: 'UserHome'}]});
  }
};

const handleUserNotificationOpen = async (remoteMessage: any) => {
  const data = remoteMessage?.data || {};
  const bookingId = String(data.bookingId || '').trim();
  const type = String(data.type || '').toUpperCase();

  if (!navigationRef.isReady()) {
    return;
  }

  if (bookingId) {
    if (type === 'RATE_RIDER') {
      navigationRef.resetRoot({
        index: 0,
        routes: [{name: 'RatingScreen', params: {bookingId: Number(bookingId)}}],
      });
      return;
    }
    await routeUserByBooking(bookingId);
    return;
  }

  navigationRef.resetRoot({index: 0, routes: [{name: 'Notifications'}]});
};

const NavigationContent = () => {
  const {showNotification} = useNotification();

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
            handleUserNotificationOpen(remoteMessage);
          },
        });
      },
      remoteMessage => {
        handleUserNotificationOpen(remoteMessage);
      },
    );

    return () => unsubscribe();
  }, [showNotification]);

  const {isAuthenticated, needsRegistration} = useSelector(
    (state: RootState) => state.auth,
  );

  return (
    <>
      <PopupNotifications />
      <Stack.Navigator screenOptions={{headerShown: false}}>
        {!isAuthenticated && !needsRegistration ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : needsRegistration ? (
          <Stack.Screen name="Register" component={RegisterScreen} />
        ) : (
          <>
            <Stack.Screen name="Home" component={UserHomeScreen} />
            <Stack.Screen name="UserHome" component={UserHomeScreen} />
            <Stack.Screen name="SelectRide" component={SelectRideScreen} />
            <Stack.Screen name="SetPrice" component={SetPriceScreen} />
            <Stack.Screen name="UserBids" component={BidsScreen} />
            <Stack.Screen name="UserTracking" component={TrackingScreen} />
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="MyBookings" component={MyBookingsScreen} />
            <Stack.Screen
              name="Notifications"
              component={NotificationsScreen}
            />
            <Stack.Screen
              name="Booking"
              component={BookingScreen}
              options={{headerShown: true, title: 'Book Service'}}
            />
            <Stack.Screen
              name="BidSelection"
              component={BidSelectionScreen}
              options={{headerShown: true, title: 'Select Rider'}}
            />
            <Stack.Screen
              name="ActiveBooking"
              component={ActiveBookingScreen}
              options={{headerShown: false}}
            />
            <Stack.Screen
              name="RiderApproaching"
              component={RiderApproachingScreen}
              options={{headerShown: false}}
            />
            <Stack.Screen
              name="RatingScreen"
              component={RatingScreen}
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

export default AppNavigator;

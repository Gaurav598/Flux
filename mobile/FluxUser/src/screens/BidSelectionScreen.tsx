import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';
import {useRoute, useNavigation} from '@react-navigation/native';
import api from '../config/api';
import {Star, User, Clock, CheckCircle} from 'lucide-react-native';
import {colors} from '../theme';
import CardGradient from '../components/CardGradient';
import {safeErrorMessage} from '../utils/safeErrorMessage';

interface Bid {
  id: number;
  bidAmount: number;
  rider: {
    id: number;
    user: {
      fullName: string;
      mobileNumber: string;
    };
    averageRating: number;
    totalRides: number;
    vehicleType: string;
    vehicleModel: string;
    vehicleRegistrationNumber: string;
  };
  createdAt: string;
  status: string;
}

const BidSelectionScreen = () => {
  const route = useRoute();
  const navigation = useNavigation<any>();
  const bookingId = Number((route.params as any)?.bookingId);

  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  const fetchBids = useCallback(async () => {
    if (!Number.isFinite(bookingId) || bookingId <= 0) {
      setBids([]);
      setLoading(false);
      return;
    }

    try {
      const response = await api.get(`/bids/booking/${bookingId}`);
      const rawBids = Array.isArray(response.data) ? response.data : [];
      setBids(rawBids.filter((bid: Bid) => bid?.status === 'PENDING'));
    } catch (error) {
      console.log('Error fetching bids:', error);
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    fetchBids();
    const interval = setInterval(fetchBids, 3000);
    return () => clearInterval(interval);
  }, [fetchBids]);

  const handleAcceptBid = async (bidId: number) => {
    if (!Number.isFinite(bidId) || bidId <= 0) {
      Alert.alert('Error', 'Invalid bid selected. Please refresh bids.');
      return;
    }

    Alert.alert('Accept Bid', 'Are you sure you want to accept this bid?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Accept',
        onPress: async () => {
          try {
            setAccepting(true);
            const response = await api.post(`/bids/${bidId}/accept`);
            const booking = response.data;
            const acceptedBookingId = Number(booking?.id);

            Alert.alert('Success', 'Bid accepted! Rider is on the way.', [
              {
                text: 'OK',
                onPress: () => {
                  if (
                    !Number.isFinite(acceptedBookingId) ||
                    acceptedBookingId <= 0
                  ) {
                    Alert.alert(
                      'Error',
                      'Bid accepted but booking details are incomplete.',
                    );
                    (navigation as any).replace('Home');
                    return;
                  }

                  navigation.navigate('UserTracking', {
                    rideId: String(acceptedBookingId),
                  });
                },
              },
            ]);
          } catch (error: any) {
            Alert.alert('Error', safeErrorMessage(error, 'Failed to accept bid'));
          } finally {
            setAccepting(false);
          }
        },
      },
    ]);
  };

  const renderBid = ({item}: {item: Bid}) => (
    <View style={styles.bidCard}>
      <CardGradient radius={20} />
      <View style={styles.riderHeader}>
        <View style={styles.riderAvatar}>
          <User size={24} color={colors.info} />
        </View>
        <View style={styles.riderInfo}>
          <Text style={styles.riderName}>{item?.rider?.user?.fullName || 'Rider'}</Text>
          <View style={styles.ratingRow}>
            <Star size={14} color={colors.accent} fill={colors.accent} />
            <Text style={styles.ratingText}>
              {(Number(item?.rider?.averageRating) || 0).toFixed(1)} ({item?.rider?.totalRides || 0} rides)
            </Text>
          </View>
        </View>
        <View style={styles.bidAmountContainer}>
          <Text style={styles.bidAmount}>₹{Number(item?.bidAmount) || 0}</Text>
        </View>
      </View>

      <View style={styles.vehicleInfo}>
        <Text style={styles.vehicleText}>
          {item?.rider?.vehicleType || 'Vehicle'} • {item?.rider?.vehicleModel || '-'}
        </Text>
        <Text style={styles.vehicleNumber}>
          {item?.rider?.vehicleRegistrationNumber || '-'}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.acceptButton}
        onPress={() => handleAcceptBid(item.id)}
        disabled={accepting}>
        <CheckCircle size={20} color={colors.text} />
        <Text style={styles.acceptButtonText}>Accept Bid</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>Finding riders...</Text>
      </View>
    );
  }

  if (!Number.isFinite(bookingId) || bookingId <= 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>Booking not found</Text>
        <Text style={styles.emptyText}>
          Could not open this booking. Please create a new request.
        </Text>
        <TouchableOpacity
          style={styles.cancelBookingButton}
          onPress={() => (navigation as any).replace('Home')}>
          <Text style={styles.cancelBookingButtonText}>Go Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleCancelBooking = () => {
    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel this booking?',
      [
        {text: 'No', style: 'cancel'},
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.post(`/bookings/${bookingId}/cancel`, null, {
                params: {reason: 'User cancelled', byUser: true},
              });
              Alert.alert('Booking Cancelled', 'Your booking has been cancelled.', [
                {
                  text: 'OK',
                  onPress: () => (navigation as any).replace('Home'),
                },
              ]);
            } catch (error) {
              Alert.alert('Error', 'Failed to cancel. Please try again.');
            }
          },
        },
      ],
    );
  };

  if (bids.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Clock size={64} color={colors.textMute} />
        <Text style={styles.emptyTitle}>Waiting for Bids</Text>
        <Text style={styles.emptyText}>
          Nearby riders will bid on your request soon
        </Text>
        <TouchableOpacity
          style={styles.cancelBookingButton}
          onPress={handleCancelBooking}>
          <Text style={styles.cancelBookingButtonText}>Cancel Booking</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Select Your Rider</Text>
        <Text style={styles.headerSubtitle}>{bids.length} bids received</Text>
      </View>

      <FlatList
        data={bids}
        renderItem={renderBid}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        ListFooterComponent={
          <TouchableOpacity
            style={styles.cancelBookingButton}
            onPress={handleCancelBooking}>
            <Text style={styles.cancelBookingButtonText}>Cancel Booking</Text>
          </TouchableOpacity>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSub,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg,
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSub,
    textAlign: 'center',
  },
  header: {
    backgroundColor: colors.surface,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSub,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 24,
  },
  bidCard: {
    backgroundColor: 'transparent',
    overflow: 'hidden',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 3,
  },
  riderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  riderAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  riderInfo: {
    flex: 1,
  },
  riderName: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.text,
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSub,
  },
  bidAmountContainer: {
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  bidAmount: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.accent,
  },
  vehicleInfo: {
    backgroundColor: colors.surfaceAlt,
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  vehicleText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSub,
    marginBottom: 4,
  },
  vehicleNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSub,
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  acceptButtonText: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.text,
  },
  cancelBookingButton: {
    marginTop: 24,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 14,
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  cancelBookingButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.danger,
    textAlign: 'center',
  },
});

export default BidSelectionScreen;

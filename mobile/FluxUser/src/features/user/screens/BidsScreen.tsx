import React, {useState, useEffect, useRef, useCallback} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {useRoute, useNavigation, RouteProp} from '@react-navigation/native';
import {getRideBids, acceptBid} from '../../../services/rideService';
import {colors} from '../../../theme';
import CardGradient from '../../../components/CardGradient';
import {safeErrorMessage} from '../../../utils/safeErrorMessage';
import {
  ChevronLeft,
  Star,
  Clock,
  Shield,
  ArrowRight,
  User,
} from 'lucide-react-native';

type RootStackParamList = {
  UserBids: {
    rideId: string;
    from: string;
    to: string;
    maxFare: number;
    vehicleType: string;
    distanceKm: number;
  };
  UserTracking: {
    rideId: string;
    rider: any;
    from: string;
    to: string;
    maxFare: number;
  };
};

type BidsScreenRouteProp = RouteProp<RootStackParamList, 'UserBids'>;
type BidsScreenNavigationProp = any;

interface BidItemProps {
  item: any;
  onAccept: (item: any) => void;
  isNew: boolean;
  disabled?: boolean;
}

const BidItem: React.FC<BidItemProps> = ({item, onAccept, isNew, disabled}) => {
  const fade = useRef(new Animated.Value(isNew ? 0 : 1)).current;
  const slide = useRef(new Animated.Value(isNew ? 20 : 0)).current;

  useEffect(() => {
    if (isNew) {
      Animated.parallel([
        Animated.timing(fade, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(slide, {
          toValue: 0,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isNew, fade, slide]);

  const riderName =
    item.rider?.user?.fullName || item.riderName || item.name || 'Rider';
  const rating = item.rider?.averageRating || item.rating || 4.8;
  const totalRides = item.rider?.totalRides || item.totalRides || 0;
  const vehicle =
    item.rider?.vehicleType || item.vehicleType || item.vehicle || 'Auto';

  return (
    <Animated.View style={{opacity: fade, transform: [{translateY: slide}]}}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => onAccept(item)}
        disabled={disabled}
        className="rounded-[32px] p-5 mb-4 shadow-sm shadow-black/5 overflow-hidden"
        style={{backgroundColor: 'transparent'}}>
        <CardGradient radius={32} />
        <View className="flex-row items-center">
          <View className="relative">
            <View
              className="w-16 h-16 rounded-2xl items-center justify-center shadow-sm"
              style={{backgroundColor: colors.surfaceAlt}}>
              <User size={32} color={colors.textMute} />
            </View>
            <View
              className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2"
              style={{backgroundColor: colors.success, borderColor: colors.surface}}
            />
          </View>

          <View className="flex-1 ml-4">
            <View className="flex-row items-center justify-between mb-1">
              <Text className="text-lg font-black" style={{color: colors.text}}>
                {riderName}
              </Text>
              <Text className="text-2xl font-black" style={{color: colors.accent}}>
                ₹{item.bidAmount}
              </Text>
            </View>

            <View className="flex-row items-center space-x-3">
              <View
                className="flex-row items-center px-2 py-1 rounded-lg"
                style={{backgroundColor: colors.accentSoft}}>
                <Star size={12} color={colors.accent} fill={colors.accent} />
                <Text className="text-xs font-black ml-1" style={{color: colors.accent}}>
                  {typeof rating === 'number' ? rating.toFixed(1) : rating}
                </Text>
              </View>
              <View
                className="flex-row items-center px-2 py-1 rounded-lg ml-2"
                style={{backgroundColor: colors.surfaceAlt}}>
                <Clock size={12} color={colors.textSub} />
                <Text className="text-xs font-black ml-1" style={{color: colors.textSub}}>
                  5 min
                </Text>
              </View>
              <View
                className="flex-row items-center px-2 py-1 rounded-lg ml-2"
                style={{backgroundColor: 'rgba(59,130,246,0.16)'}}>
                <Shield size={12} color={colors.info} />
                <Text className="text-xs font-black ml-1" style={{color: colors.info}}>
                  {totalRides} rides
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View
          className="mt-4 pt-4 border-t flex-row items-center justify-between"
          style={{borderColor: colors.border}}>
          <View className="flex-row items-center">
            <Text
              className="text-xs font-bold uppercase tracking-widest"
              style={{color: colors.textMute}}>
              Vehicle:{' '}
            </Text>
            <Text className="text-xs font-black uppercase" style={{color: colors.textSub}}>
              {vehicle}
            </Text>
          </View>
          <View className="flex-row items-center">
            <Text className="text-sm font-black mr-2" style={{color: colors.success}}>
              Accept Offer
            </Text>
            <View className="rounded-full p-1" style={{backgroundColor: colors.success}}>
              <ArrowRight size={14} color={colors.text} strokeWidth={3} />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function BidsScreen() {
  const route = useRoute<BidsScreenRouteProp>();
  const navigation = useNavigation<BidsScreenNavigationProp>();
  const rideId = route.params?.rideId ?? '';
  const from = route.params?.from ?? '';
  const to = route.params?.to ?? '';
  const maxFare = route.params?.maxFare ?? 0;
  const distanceKm = route.params?.distanceKm ?? 0;

  const [bids, setBids] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [newBidIds, setNewBidIds] = useState<Set<string>>(new Set());

  const loadBids = useCallback(async () => {
    if (!rideId) {
      return;
    }
    try {
      setLoading(true);
      const fetchedBids = await getRideBids(rideId);
      const normalizedBids = (Array.isArray(fetchedBids) ? fetchedBids : [])
        .filter((bid: any) => bid && bid.id != null)
        .map((bid: any) => ({...bid, id: String(bid.id)}));

      setBids(prevBids => {
        const previousIds = new Set(prevBids.map((bid: any) => String(bid?.id)));
        const incomingIds = normalizedBids
          .map((bid: any) => String(bid.id))
          .filter(id => !previousIds.has(id));

        if (incomingIds.length > 0) {
          setNewBidIds(current => {
            const next = new Set(current);
            incomingIds.forEach(id => next.add(id));
            return next;
          });

          setTimeout(() => {
            setNewBidIds(current => {
              const next = new Set(current);
              incomingIds.forEach(id => next.delete(id));
              return next;
            });
          }, 1200);
        }

        return normalizedBids;
      });
    } catch (error: any) {
      console.error('Error loading bids:', error);
      // Don't show alert for empty bids - it's normal to have no bids initially
    } finally {
      setLoading(false);
    }
  }, [rideId]);

  useEffect(() => {
    if (!rideId) {
      console.error('BidsScreen opened without rideId:', route.params);
      return;
    }

    loadBids();

    // Poll for bids every 5 seconds as a fallback
    const pollInterval = setInterval(loadBids, 5000);

    return () => {
      clearInterval(pollInterval);
    };
  }, [rideId, loadBids, route.params]);

  // Show error state if no rideId
  if (!rideId) {
    return (
      <View className="flex-1 items-center justify-center" style={{backgroundColor: colors.bg}}>
        <Text className="text-lg font-semibold mb-4" style={{color: colors.textSub}}>
          Invalid booking
        </Text>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="px-6 py-3 rounded-xl"
          style={{backgroundColor: colors.accent}}>
          <Text className="font-bold" style={{color: colors.onAccent}}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleAcceptBid = async (bid: any) => {
    if (!bid?.id) {
      Alert.alert('Error', 'This bid is invalid. Please wait for refresh.');
      return;
    }

    try {
      setAccepting(true);
      const acceptedBooking: any = await acceptBid(rideId, String(bid.id));

      navigation.navigate('UserTracking', {
        rideId,
        rider: acceptedBooking?.rider || bid?.rider || bid,
        from: acceptedBooking?.pickupAddress || from,
        to: acceptedBooking?.dropAddress || to,
        maxFare: Number(
          acceptedBooking?.finalFare ||
            acceptedBooking?.estimatedFare ||
            bid?.bidAmount ||
            maxFare,
        ),
      });
    } catch (error: any) {
      Alert.alert('Error', safeErrorMessage(error, 'Failed to accept bid'));
    } finally {
      setAccepting(false);
    }
  };

  return (
    <View className="flex-1" style={{backgroundColor: colors.bg}}>
      {/* Header */}
      <View
        className="pt-14 pb-6 px-6 shadow-sm shadow-black/5 z-10"
        style={{backgroundColor: colors.surface}}>
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="p-2.5 rounded-xl border"
            style={{backgroundColor: colors.surfaceAlt, borderColor: colors.border}}>
            <ChevronLeft size={24} color={colors.text} strokeWidth={2.5} />
          </TouchableOpacity>
          <View className="items-center">
            <Text className="text-xl font-black" style={{color: colors.text}}>Bids Arriving</Text>
            <View className="flex-row items-center mt-1">
              <View
                className="w-1.5 h-1.5 rounded-full mr-2"
                style={{backgroundColor: colors.success}}
              />
              <Text
                className="text-[10px] font-black uppercase tracking-widest"
                style={{color: colors.textMute}}>
                Searching nearby riders
              </Text>
            </View>
          </View>
          <View className="w-10" />
        </View>
      </View>

      <View className="flex-1 px-6 pt-4" style={{backgroundColor: colors.bg}}>
        {/* Ride Info Summary */}
        <View
          className="rounded-3xl p-6 mb-6 shadow-xl shadow-black/20 overflow-hidden"
          style={{backgroundColor: 'transparent'}}>
          <CardGradient radius={24} />
          <View className="flex-row items-center justify-between mb-4">
            <View className="px-3 py-1.5 rounded-xl" style={{backgroundColor: colors.accent}}>
              <Text
                className="text-[10px] font-black uppercase tracking-tighter"
                style={{color: colors.onAccent}}>
                Your Max Price
              </Text>
              <Text className="text-lg font-black" style={{color: colors.onAccent}}>₹{maxFare}</Text>
            </View>
            <View className="items-end">
              <Text
                className="text-[10px] font-black uppercase tracking-widest"
                style={{color: colors.textMute}}>
                Distance
              </Text>
              <Text className="text-lg font-black" style={{color: colors.text}}>
                {typeof distanceKm === 'number'
                  ? distanceKm.toFixed(1)
                  : distanceKm}{' '}
                km
              </Text>
            </View>
          </View>

          <View className="flex-row items-center">
            <View className="flex-1">
              <Text
                className="text-xs font-bold uppercase"
                style={{color: colors.textSub}}
                numberOfLines={1}>
                From: {from}
              </Text>
              <Text
                className="text-xs font-bold uppercase mt-1"
                style={{color: colors.textSub}}
                numberOfLines={1}>
                To: {to}
              </Text>
            </View>
          </View>
        </View>

        <View className="flex-row items-center justify-between mb-4 px-1">
          <Text
            className="text-xs font-black uppercase tracking-widest"
            style={{color: colors.textMute}}>
            Available Offers ({bids.length})
          </Text>
        </View>

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          {loading && bids.length === 0 ? (
            <View className="py-20 items-center">
              <ActivityIndicator size="large" color={colors.accent} />
              <Text
                className="mt-6 font-black uppercase tracking-widest text-xs"
                style={{color: colors.textMute}}>
                Finding best offers...
              </Text>
            </View>
          ) : bids.length === 0 ? (
            <View className="py-20 items-center">
              <View
                className="p-8 rounded-[40px] shadow-sm mb-6 overflow-hidden"
                style={{backgroundColor: 'transparent'}}>
                <CardGradient radius={40} />
                <Clock size={48} color={colors.accent} strokeWidth={1.5} />
              </View>
              <Text className="text-xl font-black mb-2" style={{color: colors.text}}>
                Almost there!
              </Text>
              <Text
                className="text-center px-10 font-bold leading-5"
                style={{color: colors.textMute}}>
                Waiting for nearby riders to bid on your request...
              </Text>
            </View>
          ) : (
            <View className="pb-10">
              {bids.map((item, index) => (
                <BidItem
                  key={item?.id ? String(item.id) : `${rideId}-${index}`}
                  item={item}
                  onAccept={handleAcceptBid}
                  isNew={item?.id ? newBidIds.has(String(item.id)) : false}
                  disabled={accepting}
                />
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

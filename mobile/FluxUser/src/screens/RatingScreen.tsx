import React, {useState, useRef, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  SafeAreaView,
  ScrollView,
  Animated,
  ActivityIndicator,
} from 'react-native';
import {useSelector} from 'react-redux';
import {RootState} from '../store';
import api from '../config/api';
import {
  Star,
  MessageSquare,
  ArrowLeft,
  Send,
  CheckCircle2,
  Bike,
} from 'lucide-react-native';
import {colors} from '../theme';
import {safeErrorMessage} from '../utils/safeErrorMessage';

const RatingScreen = ({navigation, route}: any) => {
  const {bookingId} = route.params || {};
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [selectedReason, setSelectedReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const {currentBooking} = useSelector((state: RootState) => state.booking);

  const complaintReasons = [
    'Rude behavior',
    'Unsafe driving',
    'Vehicle condition',
    'Wrong route taken',
    'Late arrival',
    'Other',
  ];

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const goHome = useCallback(() => {
    navigation.navigate('UserHome');
  }, [navigation]);

  const handleSubmitRating = async () => {
    if (rating === 0) {
      Alert.alert('Error', 'Please select a rating');
      return;
    }

    if (rating < 5 && !selectedReason && !comment) {
      Alert.alert(
        'Feedback Required',
        'Please select a reason or add a comment for ratings below 5 stars',
      );
      return;
    }

    setSubmitting(true);
    try {
      const finalBookingId = bookingId || currentBooking?.id;
      if (finalBookingId) {
        const reviewText =
          rating < 5 && selectedReason
            ? `${selectedReason}${comment ? ': ' + comment : ''}`
            : comment;

        await api.post(`/bookings/${finalBookingId}/rate`, null, {
          params: {
            userRating: rating,
            userReview: reviewText || undefined,
          },
        });
      }
      setSubmitted(true);
    } catch (error: any) {
      Alert.alert('Error', safeErrorMessage(error, 'Failed to submit rating'));
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <SafeAreaView
        className="flex-1 items-center justify-center px-10"
        style={{backgroundColor: colors.bg}}>
        <View
          className="p-10 rounded-[50px] mb-8 border"
          style={{
            backgroundColor: colors.successSoft,
            borderColor: colors.success,
          }}>
          <CheckCircle2 size={64} color={colors.success} strokeWidth={2.5} />
        </View>
        <Text
          className="text-3xl font-black text-center mb-4"
          style={{color: colors.text}}>
          Feedback Sent!
        </Text>
        <Text
          className="font-bold text-center leading-6 mb-12"
          style={{color: colors.textMute}}>
          Your feedback helps us keep the FLUX community safe and reliable.
        </Text>
        <TouchableOpacity
          onPress={goHome}
          className="w-full py-6 rounded-3xl items-center shadow-xl"
          style={{backgroundColor: colors.accent}}>
          <Text
            className="font-black uppercase tracking-widest"
            style={{color: colors.onAccent}}>
            Back to Home
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1" style={{backgroundColor: colors.bg}}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-6 pt-4 pb-10">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="p-2.5 rounded-xl border self-start mb-10"
            style={{
              backgroundColor: colors.surfaceAlt,
              borderColor: colors.border,
            }}>
            <ArrowLeft size={24} color={colors.text} strokeWidth={2.5} />
          </TouchableOpacity>

          <View className="items-center mb-12">
            <View
              className="p-6 rounded-[40px] shadow-2xl mb-8"
              style={{backgroundColor: colors.accent}}>
              <Bike size={48} color={colors.onAccent} strokeWidth={2.5} />
            </View>
            <Text
              className="text-4xl font-black text-center"
              style={{color: colors.text}}>
              Rate Your Trip
            </Text>
            <Text className="font-bold mt-2" style={{color: colors.textMute}}>
              How was your journey with us?
            </Text>
          </View>

          <View
            className="rounded-[40px] p-8 border mb-8"
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.border,
            }}>
            <Text
              className="text-xs font-black uppercase tracking-[4px] text-center mb-8"
              style={{color: colors.textMute}}>
              Tap to Rate
            </Text>

            <View className="flex-row justify-center space-x-4 mb-10">
              {[1, 2, 3, 4, 5].map(s => (
                <TouchableOpacity
                  key={s}
                  onPress={() => setRating(s)}
                  className="mx-1">
                  <Star
                    size={42}
                    color={s <= rating ? colors.accent : colors.borderStrong}
                    fill={s <= rating ? colors.accent : 'transparent'}
                    strokeWidth={2.5}
                  />
                </TouchableOpacity>
              ))}
            </View>

            {rating > 0 && rating < 5 && (
              <View className="mb-6">
                <Text
                  className="text-xs font-black uppercase tracking-[4px] mb-4"
                  style={{color: colors.textMute}}>
                  What went wrong?
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {complaintReasons.map(reason => (
                    <TouchableOpacity
                      key={reason}
                      onPress={() =>
                        setSelectedReason(
                          reason === selectedReason ? '' : reason,
                        )
                      }
                      className="px-4 py-3 rounded-2xl border-2"
                      style={{
                        backgroundColor:
                          selectedReason === reason
                            ? colors.dangerSoft
                            : colors.surfaceAlt,
                        borderColor:
                          selectedReason === reason
                            ? colors.danger
                            : colors.border,
                      }}>
                      <Text
                        className="text-sm font-bold"
                        style={{
                          color:
                            selectedReason === reason
                              ? colors.danger
                              : colors.textSub,
                        }}>
                        {reason}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <View
              className="flex-row items-start border rounded-[32px] px-6 py-5 shadow-sm"
              style={{
                backgroundColor: colors.surfaceAlt,
                borderColor: colors.border,
              }}>
              <MessageSquare
                size={20}
                color={colors.textMute}
                className="mt-1"
              />
              <TextInput
                className="flex-1 ml-4 text-base font-bold min-h-[100px]"
                style={{color: colors.text}}
                placeholder={
                  rating < 5
                    ? 'Add more details (optional)'
                    : 'Share your experience (optional)'
                }
                placeholderTextColor={colors.textMute}
                value={comment}
                onChangeText={setComment}
                multiline
                textAlignVertical="top"
              />
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.9}
            onPress={handleSubmitRating}
            disabled={submitting}
            className="rounded-3xl py-6 flex-row items-center justify-center shadow-xl"
            style={{
              backgroundColor: submitting ? colors.surfaceHigh : colors.accent,
            }}>
            {submitting ? (
              <ActivityIndicator color={colors.accent} />
            ) : (
              <>
                <Text
                  className="text-lg font-black uppercase tracking-widest mr-3"
                  style={{color: colors.onAccent}}>
                  Submit Review
                </Text>
                <Send size={20} color={colors.onAccent} strokeWidth={3} />
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default RatingScreen;

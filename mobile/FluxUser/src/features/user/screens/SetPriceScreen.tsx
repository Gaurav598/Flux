import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import {ArrowLeft, Plus, Edit3} from 'lucide-react-native';
import {createRideRequest} from '../../../services/rideService';
import {colors} from '../../../theme';
import CardGradient from '../../../components/CardGradient';
import {safeErrorMessage} from '../../../utils/safeErrorMessage';

const QUICK_INCREMENTS = [10, 20, 30];

const SetPriceScreen = ({navigation, route}: any) => {
  const {pickup, drop, distanceKm, pickupCoords, dropCoords, vehicle} =
    route.params;

  // Safely get vehicle label
  const vehicleId = String(vehicle?.id || '').toLowerCase();
  const vehicleLabel = vehicle?.label || vehicle?.name || 'Auto';
  const serviceType = vehicleId === 'parcel' ? 'PARCEL' : 'RIDE';

  const vehicleBaseMin = Number(vehicle?.baseMin) || 100;
  const vehicleBasePerKm = vehicleBaseMin / 18;
  const baseFare = Math.max(Math.round(vehicleBasePerKm * distanceKm), 30);
  const [userAmount, setUserAmount] = useState(baseFare);
  const [manualInput, setManualInput] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pressed, setPressed] = useState(false);

  const handleQuickIncrement = (amount: number) => {
    setUserAmount(prev => prev + amount);
    setShowManualInput(false);
  };

  const handleManualSubmit = () => {
    const amount = parseInt(manualInput);
    if (amount && amount >= baseFare) {
      setUserAmount(amount);
      setShowManualInput(false);
      setManualInput('');
    } else {
      Alert.alert(
        'Invalid Amount',
        `Please enter amount greater than or equal to ₹${baseFare}`,
      );
    }
  };

  const handleFindRiders = async () => {
    if (!pickupCoords || !dropCoords) {
      Alert.alert('Error', 'Location coordinates are missing');
      return;
    }

    if (userAmount < baseFare) {
      Alert.alert('Error', `Amount must be at least ₹${baseFare}`);
      return;
    }

    try {
      if (pressed) {
        return;
      } // prevent double press
      setPressed(true);
      setLoading(true);
      const result = await createRideRequest({
        pickupLocation: {
          latitude: pickupCoords.latitude,
          longitude: pickupCoords.longitude,
          address: pickup,
        },
        dropLocation: {
          latitude: dropCoords.latitude,
          longitude: dropCoords.longitude,
          address: drop,
        },
        serviceType,
        vehicleType: vehicleLabel,
        userEnteredAmount: userAmount,
        distanceKm,
      });

      console.log('createRideRequest result:', result);
      const rideId = result?.rideId ?? null;
      if (!rideId) {
        console.error('Booking created but no rideId returned', result);
        Alert.alert(
          'Error',
          'Booking created but server did not return booking id',
        );
        setPressed(false);
        return;
      }

      // small delay to avoid potential navigation race conditions
      try {
        await new Promise(res => setTimeout(res, 200));
        navigation.navigate('UserBids', {
          rideId: String(rideId),
          from: pickup,
          to: drop,
          maxFare: userAmount,
          vehicleType: vehicleLabel,
          distanceKm,
        });
      } catch (navError) {
        console.error('Navigation error to UserBids:', navError);
        Alert.alert('Error', 'Unable to proceed to bids screen');
      } finally {
        setPressed(false);
      }
    } catch (error: any) {
      console.error('Create ride failed:', error);
      Alert.alert(
        'Error',
        safeErrorMessage(error, 'Failed to create ride request'),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Set Your Price</Text>
        <View style={{width: 40}} />
      </SafeAreaView>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.label}>Your Offer · {vehicleLabel}</Text>
          <View style={styles.offerCard}>
            <CardGradient radius={16} />
            <Text style={styles.offerAmount}>₹{userAmount}</Text>
            <Text style={styles.offerLabel}>
              Riders will bid around this amount
            </Text>
            <View style={styles.minRow}>
              <Text style={styles.minText}>Minimum fare ₹{baseFare}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Quick Adjustments</Text>
          <View style={styles.quickButtons}>
            {QUICK_INCREMENTS.map(amount => (
              <TouchableOpacity
                key={amount}
                style={styles.quickButton}
                onPress={() => handleQuickIncrement(amount)}>
                <Plus size={16} color={colors.text} />
                <Text style={styles.quickButtonText}>₹{amount}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <TouchableOpacity
            style={styles.manualButton}
            onPress={() => setShowManualInput(!showManualInput)}>
            <Edit3 size={18} color={colors.textSub} />
            <Text style={styles.manualButtonText}>Enter Custom Amount</Text>
          </TouchableOpacity>

          {showManualInput && (
            <View style={styles.manualInputContainer}>
              <TextInput
                style={styles.manualInput}
                placeholder={`Min ₹${baseFare}`}
                placeholderTextColor={colors.textMute}
                keyboardType="number-pad"
                value={manualInput}
                onChangeText={setManualInput}
              />
              <TouchableOpacity
                style={styles.manualSubmitButton}
                onPress={handleManualSubmit}>
                <Text style={styles.manualSubmitText}>Apply</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            💡 Higher offers may attract riders faster, but you can always
            choose the best bid.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.createButton, loading && {opacity: 0.5}]}
          onPress={handleFindRiders}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color={colors.onAccent} />
          ) : (
            <Text style={styles.createButtonText}>Create Ride Request</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.bg},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {padding: 8},
  headerTitle: {fontSize: 18, fontWeight: '600', color: colors.text},
  content: {flex: 1, paddingHorizontal: 20},
  section: {marginTop: 24},
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSub,
    marginBottom: 12,
  },
  baseFareCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  baseFareAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  baseFareLabel: {fontSize: 14, color: colors.textSub},
  offerCard: {
    backgroundColor: 'transparent',
    borderRadius: 16,
    padding: 24,
    overflow: 'hidden',
  },
  offerAmount: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.accent,
    marginBottom: 8,
  },
  offerLabel: {fontSize: 14, color: colors.textMute},
  minRow: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  minText: {fontSize: 13, fontWeight: '700', color: colors.textSub},
  quickButtons: {flexDirection: 'row', gap: 12},
  quickButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickButtonText: {fontSize: 16, fontWeight: '600', color: colors.text},
  manualButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  manualButtonText: {fontSize: 14, fontWeight: '500', color: colors.textSub},
  manualInputContainer: {flexDirection: 'row', gap: 12, marginTop: 12},
  manualInput: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
  },
  manualSubmitButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: 24,
    borderRadius: 12,
    justifyContent: 'center',
  },
  manualSubmitText: {fontSize: 14, fontWeight: '600', color: colors.onAccent},
  infoBox: {
    backgroundColor: colors.accentSoft,
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    marginBottom: 100,
  },
  infoText: {fontSize: 14, color: colors.accent, lineHeight: 20},
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  createButton: {
    backgroundColor: colors.accent,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  createButtonText: {fontSize: 16, fontWeight: '600', color: colors.onAccent},
});

export default SetPriceScreen;

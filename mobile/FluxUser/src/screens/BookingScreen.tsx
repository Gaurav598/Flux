import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import api from '../config/api';
import {colors} from '../theme';

const BookingScreen = ({route, navigation}: any) => {
  const {serviceType} = route.params;

  const [pickupAddress, setPickupAddress] = useState('');
  const [dropAddress, setDropAddress] = useState('');
  const [description, setDescription] = useState('');
  const [estimatedBudget, setEstimatedBudget] = useState('');
  const [loading, setLoading] = useState(false);

  const serviceConfig = {
    ride: {
      title: 'Book a Ride',
      icon: '🏍️',
      color: '#3b82f6',
      fields: ['pickup', 'drop'],
    },
    errand: {
      title: 'Book an Errand',
      icon: '🛒',
      color: '#10b981',
      fields: ['pickup', 'drop', 'description', 'budget'],
    },
    parcel: {
      title: 'Send a Parcel',
      icon: '📦',
      color: '#f59e0b',
      fields: ['pickup', 'drop', 'description'],
    },
  };

  const config = serviceConfig[serviceType as keyof typeof serviceConfig];

  const handleSubmit = async () => {
    if (!pickupAddress || !dropAddress) {
      Alert.alert('Error', 'Please fill in pickup and drop locations');
      return;
    }

    if (serviceType === 'errand' && !description) {
      Alert.alert('Error', 'Please describe the errand task');
      return;
    }

    setLoading(true);
    try {
      const bookingData = {
        serviceType: serviceType.toUpperCase(),
        vehicleType: 'BIKE',
        pickupAddress,
        pickupLatitude: 28.6139,
        pickupLongitude: 77.209,
        dropAddress,
        dropLatitude: 28.6239,
        dropLongitude: 77.219,
        description: description || undefined,
        estimatedBudget: estimatedBudget
          ? parseFloat(estimatedBudget)
          : undefined,
      };

      const response = await api.post('/bookings', bookingData);
      const booking = response.data;

      navigation.navigate('BidSelection', {bookingId: booking.id});
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to create booking',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.icon, {color: config.color}]}>{config.icon}</Text>
        <Text style={styles.title}>{config.title}</Text>
      </View>

      <View style={styles.form}>
        {config.fields.includes('pickup') && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Pickup Location</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter pickup address"
              placeholderTextColor={colors.textMute}
              value={pickupAddress}
              onChangeText={setPickupAddress}
            />
          </View>
        )}

        {config.fields.includes('drop') && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Drop Location</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter drop address"
              placeholderTextColor={colors.textMute}
              value={dropAddress}
              onChangeText={setDropAddress}
            />
          </View>
        )}

        {config.fields.includes('description') && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              {serviceType === 'errand' ? 'Task Description' : 'Parcel Details'}
            </Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder={
                serviceType === 'errand'
                  ? 'Describe what you need done (e.g., buy groceries, collect medicine)'
                  : 'Describe the parcel (type, size, weight)'
              }
              placeholderTextColor={colors.textMute}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
            />
          </View>
        )}

        {config.fields.includes('budget') && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Estimated Budget (₹)</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter estimated amount for purchases"
              placeholderTextColor={colors.textMute}
              value={estimatedBudget}
              onChangeText={setEstimatedBudget}
              keyboardType="numeric"
            />
          </View>
        )}

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>How it works:</Text>
          <Text style={styles.infoText}>
            1. Submit your booking request{'\n'}
            2. Nearby riders will bid on your request{'\n'}
            3. Choose your preferred rider{'\n'}
            4. Track your {serviceType} in real-time
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, {backgroundColor: colors.accent}]}
          onPress={handleSubmit}
          disabled={loading}>
          <Text style={styles.submitButtonText}>
            {loading ? 'Creating...' : 'Find Riders'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  icon: {
    fontSize: 48,
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  form: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSub,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surfaceAlt,
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: colors.text,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: colors.accent,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSub,
    lineHeight: 20,
  },
  submitButton: {
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  submitButtonText: {
    color: colors.onAccent,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default BookingScreen;

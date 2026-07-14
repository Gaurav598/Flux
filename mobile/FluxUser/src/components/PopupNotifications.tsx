import React, {useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import {X, Bell, CheckCircle, AlertCircle} from 'lucide-react-native';
import {useNotification} from '../context/NotificationContext';
import {colors} from '../theme';

const NotificationItem: React.FC<{
  id: string;
  title: string;
  body: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  onPress?: () => void;
}> = ({id, title, body, type = 'info', onPress}) => {
  const {hideNotification} = useNotification();
  const translateY = useRef(new Animated.Value(-150)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto hide animation
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -150,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => hideNotification(id));
    }, 4500);

    return () => clearTimeout(timer);
  }, [id, hideNotification, translateY, opacity]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle size={24} color={colors.success} />;
      case 'error':
        return <AlertCircle size={24} color={colors.danger} />;
      case 'warning':
        return <AlertCircle size={24} color={colors.warning} />;
      default:
        return <Bell size={24} color={colors.info} />;
    }
  };

  const getBgColor = () => {
    return colors.surface;
  };

  const getBorderColor = () => {
    switch (type) {
      case 'success':
        return colors.success;
      case 'error':
        return colors.danger;
      case 'warning':
        return colors.warning;
      default:
        return colors.info;
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: getBgColor(),
          borderColor: getBorderColor(),
          transform: [{translateY}],
          opacity,
        },
      ]}>
      <TouchableOpacity
        style={styles.tapArea}
        activeOpacity={0.85}
        onPress={() => {
          if (onPress) {
            onPress();
          }
          hideNotification(id);
        }}>
      <View style={styles.iconContainer}>{getIcon()}</View>
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.body} numberOfLines={2}>
          {body}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.closeButton}
        onPress={() => hideNotification(id)}>
        <X size={18} color={colors.textMute} />
      </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

export const PopupNotifications: React.FC = () => {
  const {notifications} = useNotification();

  if (notifications.length === 0) {
    return null;
  }

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      {notifications.map(notification => (
        <NotificationItem
          key={notification.id}
          id={notification.id}
          title={notification.title}
          body={notification.body}
          type={notification.type}
          onPress={notification.onPress}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingHorizontal: 16,
  },
  container: {
    padding: 0,
    overflow: 'hidden',
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: 10,
  },
  tapArea: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  iconContainer: {
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 2,
  },
  body: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSub,
    lineHeight: 18,
  },
  closeButton: {
    padding: 4,
    marginLeft: 8,
  },
});

export default PopupNotifications;

import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
} from 'react-native';
import api from '../config/api';
import {Bell, ArrowLeft, CheckCircle2, Info, Inbox} from 'lucide-react-native';
import {colors} from '../theme';
import CardGradient from '../components/CardGradient';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

const NotificationsScreen = ({navigation}: any) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const response = await api.get('/notifications');
      setNotifications(response.data);
    } catch (error) {
      console.log('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev =>
        prev.map(n => (n.id === id ? {...n, read: true} : n)),
      );
    } catch (error) {
      console.log('Error marking notification as read:', error);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'RIDE_ACCEPTED':
        return {icon: CheckCircle2, color: colors.success};
      case 'RIDER_ARRIVED':
        return {icon: Bell, color: colors.accent};
      default:
        return {icon: Info, color: colors.info};
    }
  };

  const renderNotification = ({item}: {item: Notification}) => {
    const {icon: Icon, color} = getIcon(item.type);
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        style={[styles.notifCard, !item.read && styles.notifUnread]}
        onPress={() => markAsRead(item.id)}>
        <CardGradient radius={32} />
        <View style={[styles.iconContainer, {backgroundColor: `${color}15`}]}>
          <Icon size={20} color={color} strokeWidth={2.5} />
        </View>

        <View style={styles.notifContent}>
          <View style={styles.notifHeader}>
            <Text style={[styles.notifTitle, !item.read && styles.fontBlack]}>
              {item.title}
            </Text>
            {!item.read && <View style={styles.unreadDot} />}
          </View>
          <Text style={styles.notifMessage} numberOfLines={2}>
            {item.message}
          </Text>
          <Text style={styles.notifTime}>
            {new Date(item.createdAt).toLocaleDateString(undefined, {
              day: '2-digit',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} strokeWidth={2.5} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Notifications</Text>
          <Text style={styles.headerSubtitle}>Stay updated on your rides</Text>
        </View>
      </View>

      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={fetchNotifications}
            tintColor={colors.accent}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <CardGradient radius={50} />
              <Inbox size={64} color={colors.textMute} strokeWidth={1.5} />
            </View>
            <Text style={styles.emptyTitle}>No updates yet</Text>
            <Text style={styles.emptySubtitle}>
              Ride updates and account notifications will appear here.
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.bg},
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    backgroundColor: colors.surfaceAlt,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 16,
  },
  headerTitle: {fontSize: 24, fontWeight: '900', color: colors.text},
  headerSubtitle: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.textMute,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 2,
  },
  listContent: {padding: 24},
  notifCard: {
    flexDirection: 'row',
    padding: 20,
    marginBottom: 16,
    borderRadius: 32,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  notifUnread: {backgroundColor: colors.accentSoft, borderColor: colors.accent},
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  notifContent: {flex: 1},
  notifHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  notifTitle: {
    fontSize: 16,
    flex: 1,
    paddingRight: 8,
    fontWeight: '700',
    color: colors.textSub,
  },
  fontBlack: {fontWeight: '900', color: colors.text},
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
    marginTop: 8,
  },
  notifMessage: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSub,
    lineHeight: 20,
    marginBottom: 8,
  },
  notifTime: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.textMute,
    textTransform: 'uppercase',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    backgroundColor: 'transparent',
    overflow: 'hidden',
    padding: 40,
    borderRadius: 50,
    marginBottom: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textMute,
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 20,
  },
});

export default NotificationsScreen;

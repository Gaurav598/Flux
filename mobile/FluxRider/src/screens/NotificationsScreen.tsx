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
import {
  Bell,
  ArrowLeft,
  CheckCircle2,
  Info,
  Inbox,
  MailOpen,
} from 'lucide-react-native';
import {colors} from '../theme';
import CardGradient from '../components/CardGradient';

interface Notification {
  id: number;
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

  const markAsRead = async (id: number) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev =>
        prev.map(n => (n.id === id ? {...n, read: true} : n)),
      );
    } catch (error) {
      console.log('Error marking notification as read:', error);
    }
  };

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({...n, read: true})));
    } catch (error) {
      console.log('Error marking all as read:', error);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'NEW_BOOKING':
        return {icon: Bell, color: colors.accent};
      case 'PAYMENT_RECEIVED':
        return {icon: CheckCircle2, color: colors.success};
      case 'SYSTEM_ALERT':
        return {icon: Info, color: colors.danger};
      default:
        return {icon: Inbox, color: colors.info};
    }
  };

  const renderNotification = ({item}: {item: Notification}) => {
    const {icon: Icon, color} = getIcon(item.type);
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        style={[styles.notifCard, !item.read && styles.unreadCard]}
        onPress={() => markAsRead(item.id)}>
        {item.read && <CardGradient radius={24} />}
        <View style={[styles.iconContainer, {backgroundColor: `${color}15`}]}>
          <Icon size={20} color={color} strokeWidth={2.5} />
        </View>

        <View style={styles.notifContent}>
          <View style={styles.notifHeader}>
            <Text style={[styles.notifTitle, !item.read && styles.unreadTitle]}>
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
        <View style={styles.headerTop}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}>
            <ArrowLeft size={24} color={colors.text} strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Inbox</Text>
          <TouchableOpacity onPress={markAllRead} style={styles.actionBtn}>
            <MailOpen size={20} color={colors.textSub} />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerSubtitle}>Captain Updates & Alerts</Text>
      </View>

      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={item => item.id.toString()}
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
              <Inbox size={64} color={colors.textMute} strokeWidth={1.5} />
            </View>
            <Text style={styles.emptyTitle}>Nothing here yet</Text>
            <Text style={styles.emptySubtitle}>
              New orders and account updates will appear here. Keep your app
              online to stay updated!
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMute,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 2,
  },
  actionBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 20,
    paddingBottom: 40,
  },
  notifCard: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
    overflow: 'hidden',
    padding: 16,
    borderRadius: 24,
    marginBottom: 12,
  },
  unreadCard: {
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  notifContent: {
    flex: 1,
  },
  notifHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  notifTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textSub,
    flex: 1,
  },
  unreadTitle: {
    fontWeight: '900',
    color: colors.text,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
    marginLeft: 10,
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
    fontWeight: '800',
    color: colors.textMute,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMute,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default NotificationsScreen;

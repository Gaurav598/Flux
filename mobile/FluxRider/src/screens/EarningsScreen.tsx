import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  RefreshControl,
  StyleSheet,
  Platform,
} from 'react-native';
import api from '../config/api';
import {colors} from '../theme';
import CardGradient from '../components/CardGradient';
import {
  ArrowLeft,
  Wallet,
  TrendingUp,
  Calendar,
  IndianRupee,
  ArrowUpRight,
  ArrowDownLeft,
  CreditCard,
  PieChart,
} from 'lucide-react-native';

const EarningsScreen = ({navigation}: any) => {
  const [loading, setLoading] = useState(false);
  const [earnings, setEarnings] = useState({
    today: 0,
    week: 0,
    month: 0,
    trips: 0,
    rating: 0,
  });
  const [transactions, setTransactions] = useState<any[]>([]);

  const fetchEarnings = async () => {
    setLoading(true);
    try {
      const response = await api.get('/rider/stats');
      setEarnings({
        today: response.data.earningsToday || 0,
        week: response.data.earningsWeek || 0,
        month: response.data.earningsMonth || 0,
        trips: response.data.totalRides || 0,
        rating: response.data.averageRating || 0,
      });

      // Fetch transaction history
      const transactionsResponse = await api.get('/rider/transactions');
      setTransactions(transactionsResponse.data || []);
    } catch (error) {
      console.log('Error fetching earnings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEarnings();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}>
          <ArrowLeft size={24} color={colors.text} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Financials</Text>
        <TouchableOpacity style={styles.payoutBtn}>
          <IndianRupee size={18} color={colors.onAccent} strokeWidth={3} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={fetchEarnings}
            tintColor={colors.accent}
          />
        }>
        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <CardGradient radius={32} />
          <View style={styles.balanceHeader}>
            <View style={styles.walletIcon}>
              <Wallet size={20} color="white" />
            </View>
            <Text style={styles.balanceLabel}>Available Balance</Text>
          </View>

          <Text style={styles.balanceAmount}>₹{earnings.today}</Text>

          <View style={styles.balanceFooter}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Total Trips</Text>
              <Text style={styles.statValue}>{earnings.trips}</Text>
            </View>
            <TouchableOpacity style={styles.withdrawBtn}>
              <Text style={styles.withdrawText}>Withdraw</Text>
              <ArrowUpRight size={16} color={colors.onAccent} strokeWidth={3} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <CardGradient radius={24} />
            <View
              style={[
                styles.statIconContainer,
                {backgroundColor: '#3B82F615'},
              ]}>
              <Calendar size={18} color="#3B82F6" />
            </View>
            <Text style={styles.statCardLabel}>Weekly</Text>
            <Text style={styles.statCardValue}>₹{earnings.week}</Text>
            <View style={styles.trendBadge}>
              <TrendingUp size={10} color="#10B981" />
              <Text style={styles.trendText}>+8%</Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <CardGradient radius={24} />
            <View
              style={[
                styles.statIconContainer,
                {backgroundColor: '#10B98115'},
              ]}>
              <PieChart size={18} color="#10B981" />
            </View>
            <Text style={styles.statCardLabel}>Monthly</Text>
            <Text style={styles.statCardValue}>₹{earnings.month}</Text>
            <View style={styles.trendBadge}>
              <TrendingUp size={10} color="#10B981" />
              <Text style={styles.trendText}>+12%</Text>
            </View>
          </View>
        </View>

        {/* Transactions */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <TouchableOpacity>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>

        {transactions.length > 0 ? (
          transactions.map((item: any) => (
            <View key={item.id} style={styles.transactionItem}>
              <CardGradient radius={24} />
              <View
                style={[
                  styles.itemIcon,
                  {
                    backgroundColor:
                      item.type === 'credit' ? colors.successSoft : colors.surfaceAlt,
                  },
                ]}>
                {item.type === 'credit' ? (
                  <ArrowDownLeft size={20} color={colors.success} strokeWidth={2.5} />
                ) : (
                  <CreditCard size={20} color={colors.textSub} strokeWidth={2.5} />
                )}
              </View>
              <View style={styles.itemInfo}>
                <Text style={styles.itemTitle}>
                  {item.title || item.description}
                </Text>
                <Text style={styles.itemSubtitle}>
                  {item.subtitle || `Booking #${item.bookingId}`}
                </Text>
              </View>
              <View style={styles.itemRight}>
                <Text
                  style={[
                    styles.itemAmount,
                    {color: item.type === 'credit' ? colors.success : colors.text},
                  ]}>
                  {item.type === 'credit' ? '+' : '-'} ₹{Math.abs(item.amount)}
                </Text>
                <Text style={styles.itemTime}>
                  {new Date(item.createdAt).toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No transactions yet</Text>
          </View>
        )}

        <View style={{height: Platform.OS === 'ios' ? 100 : 90}} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
    fontSize: 20,
    fontWeight: '900',
    color: colors.text,
  },
  payoutBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  balanceCard: {
    backgroundColor: 'transparent',
    overflow: 'hidden',
    borderRadius: 32,
    padding: 30,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  walletIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  balanceLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  balanceAmount: {
    fontSize: 48,
    fontWeight: '900',
    color: colors.accent,
    marginBottom: 30,
  },
  balanceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '900',
    color: 'white',
  },
  withdrawBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
  },
  withdrawText: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.onAccent,
    marginRight: 6,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  statCard: {
    width: '47%',
    backgroundColor: 'transparent',
    overflow: 'hidden',
    borderRadius: 24,
    padding: 20,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  statCardLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMute,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  statCardValue: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.text,
    marginBottom: 10,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successSoft,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  trendText: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.success,
    marginLeft: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.text,
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.accent,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    overflow: 'hidden',
    borderRadius: 24,
    padding: 16,
    marginBottom: 12,
  },
  itemIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  itemSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMute,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  itemRight: {
    alignItems: 'flex-end',
  },
  itemAmount: {
    fontSize: 16,
    fontWeight: '900',
  },
  itemTime: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMute,
    marginTop: 2,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMute,
  },
});

export default EarningsScreen;

import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

import type { RootStackParamList } from '@typ/navigation';
import type { Order } from '@typ/domain';
import { getMyOrders, subscribeMyOrders } from '@apis/orderApi';
import { getMenu } from '@apis/catalogApi';
import { isOk } from '@apis/client';
import { useCart } from '@contexts/CartContext';
import { useDialog } from '@contexts/DialogContext';
import { ORDER_STATUS, ORDER_TYPE } from '@dt/constants';
import { dateTime, won } from '@utils/formatter';
import { Badge, ScreenWrapper, SecondaryButton, SkeletonList, Typography } from '@components/common';
import { screen, theme } from '@styles';

const ACTIVE: Order['status'][] = ['PENDING', 'ACCEPTED', 'READY', 'DELIVERING'];

/** 주문내역: 진행중 주문은 위에 강조, 상태는 Realtime 으로 갱신. 지난 주문은 재주문 가능 */
const OrdersScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { add, cart } = useCart();
  const { confirm, alert } = useDialog();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const res = await getMyOrders();
    setOrders(isOk(res) && res.orders ? res.orders : []);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useEffect(() => {
    const unsub = subscribeMyOrders((orderId, status) => {
      setOrders((prev) => (prev ?? []).map((o) => (o.id === orderId ? { ...o, status } : o)));
      const st = ORDER_STATUS[status];
      Toast.show({ type: status === 'REJECTED' || status === 'CANCELED' ? 'error' : 'success', text1: `주문 상태가 '${st.label}'(으)로 바뀌었어요`, text2: st.desc });
    });
    return unsub;
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  /** 재주문: 같은 메뉴를 옵션 없이 장바구니에 담는다 (옵션은 가게 상세에서 다시 고른다) */
  const reorder = async (order: Order) => {
    if (cart && cart.storeId !== order.storeId) {
      const yes = await confirm({ title: '장바구니 교체', message1: `${cart.storeName}의 장바구니를 비우고 ${order.storeName} 메뉴를 담을까요?`, confirmText: '담기', cancelText: '취소' });
      if (!yes) return;
    }
    let added = 0;
    let first = true;
    for (const item of order.items) {
      // 메뉴가 아직 판매중인지 확인 (서버가 다시 검증하지만 담기 전에 걸러 준다)
      const res = await getMenu(item.menuId ?? '');
      if (!isOk(res) || !res.menu || res.menu.saleStatus !== 'ON_SALE') continue;
      const m = res.menu;
      if (m.optionGroups.some((g) => g.required)) continue; // 필수 옵션이 있는 메뉴는 직접 골라야 한다
      add({ id: order.storeId, name: order.storeName }, { key: `${m.id}:`, menuId: m.id, menuName: m.name, basePrice: m.price, unitPrice: m.price, quantity: item.quantity, options: [], adultOnly: m.adultOnly }, first);
      first = false;
      added += 1;
    }
    if (added === 0) {
      await alert({ title: '재주문', message1: '바로 담을 수 있는 메뉴가 없어요.', message2: '필수 옵션이 있거나 품절된 메뉴는 가게에서 다시 골라 주세요.' });
      navigation.navigate('StoreDetail', { storeId: order.storeId });
      return;
    }
    Toast.show({ type: 'success', text1: `${added}개 메뉴를 장바구니에 담았어요`, text2: added < order.items.length ? '옵션이 필요한 메뉴는 가게에서 다시 골라 주세요' : undefined });
    navigation.navigate('Cart');
  };

  const active = (orders ?? []).filter((o) => ACTIVE.includes(o.status));
  const past = (orders ?? []).filter((o) => !ACTIVE.includes(o.status));

  return (
    <ScreenWrapper backgroundColor={theme.colors.bg} inTab>
      {orders === null ? (
        <View style={{ padding: 16 }}>
          <SkeletonList rows={4} />
        </View>
      ) : (
        <FlatList
          data={[...active, ...past]}
          keyExtractor={(o) => o.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
          ListHeaderComponent={
            active.length ? (
              <Typography mode="subtitle3" color="gray500" style={{ marginBottom: 4 }}>
                진행중 {active.length}건
              </Typography>
            ) : null
          }
          renderItem={({ item, index }) => {
            const isActive = ACTIVE.includes(item.status);
            const st = ORDER_STATUS[item.status];
            const showPastHead = !isActive && (index === 0 || ACTIVE.includes((orders ?? [])[index - 1]?.status));
            return (
              <View>
                {showPastHead && (
                  <Typography mode="subtitle3" color="gray500" style={{ marginBottom: 4, marginTop: index ? 12 : 0 }}>
                    지난 주문
                  </Typography>
                )}
                <Pressable onPress={() => navigation.navigate('OrderDetail', { orderId: item.id })} style={[styles.card, isActive && styles.cardActive]}>
                  <View style={styles.topRow}>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <Badge label={ORDER_TYPE[item.orderType].label} tone={ORDER_TYPE[item.orderType].tone} size="medium" />
                      <Badge label={st.label} tone={st.tone} size="medium" />
                    </View>
                    <Typography mode="caption1" color="gray500">
                      {dateTime(item.createdAt)}
                    </Typography>
                  </View>
                  <Typography mode="subtitle1" color="gray900">
                    {item.storeName}
                  </Typography>
                  <Typography mode="body2" color="gray600" numberOfLines={1}>
                    {item.items[0]?.menuName}
                    {item.items.length > 1 ? ` 외 ${item.items.length - 1}건` : ''} · {won(item.totalAmount)}
                  </Typography>
                  {isActive ? (
                    <View style={styles.statusLine}>
                      <MaterialCommunityIcons name="progress-clock" size={16} color={theme.colors.orange600} />
                      <Typography mode="caption1" color="orange700">
                        {st.desc}
                      </Typography>
                    </View>
                  ) : (
                    <View style={styles.actions}>
                      <SecondaryButton label="같은 메뉴 재주문" size="sm" onPress={() => reorder(item)} />
                      <SecondaryButton label="가게 보기" size="sm" onPress={() => navigation.navigate('StoreDetail', { storeId: item.storeId })} />
                    </View>
                  )}
                </Pressable>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <MaterialCommunityIcons name="receipt-text-outline" size={40} color={theme.colors.gray300} />
              <Typography mode="body1" color="gray500">
                아직 주문한 적이 없어요
              </Typography>
            </View>
          }
        />
      )}
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  list: { paddingHorizontal: 16, paddingTop: screen.topForm, paddingBottom: 16, gap: 10, flexGrow: 1 },
  card: { backgroundColor: theme.colors.white, borderRadius: theme.radius.lg, padding: 16, gap: 6, boxShadow: theme.shadow.card },
  cardActive: { borderWidth: 1.5, borderColor: theme.colors.orange300 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusLine: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, backgroundColor: theme.colors.orange50, borderRadius: theme.radius.sm, paddingHorizontal: 10, paddingVertical: 8 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 6 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 80 },
});

export default OrdersScreen;

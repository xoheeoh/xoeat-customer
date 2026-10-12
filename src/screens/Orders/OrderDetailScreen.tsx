import { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

import type { RootStackParamList } from '@typ/navigation';
import type { Order, OrderStatus } from '@typ/domain';
import { cancelMyOrder, getOrder, subscribeMyOrders } from '@apis/orderApi';
import { getStore } from '@apis/catalogApi';
import { isOk } from '@apis/client';
import { useDialog } from '@contexts/DialogContext';
import { ORDER_STATUS, ORDER_TYPE } from '@dt/constants';
import { loadingController } from '@utils/loadingController';
import { dateTime, timeOnly, won } from '@utils/formatter';
import { Badge, ScreenWrapper, SecondaryButton, SkeletonList, Typography } from '@components/common';
import { screen, theme } from '@styles';

type Props = NativeStackScreenProps<RootStackParamList, 'OrderDetail'>;
type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

/** 진행 단계 (배달 / 포장) */
const STEPS: Record<'DELIVERY' | 'PICKUP', { status: OrderStatus; label: string; icon: IconName }[]> = {
  DELIVERY: [
    { status: 'PENDING', label: '주문 접수', icon: 'receipt-text-outline' },
    { status: 'ACCEPTED', label: '조리중', icon: 'chef-hat' },
    { status: 'DELIVERING', label: '배달중', icon: 'moped-outline' },
    { status: 'COMPLETED', label: '배달 완료', icon: 'check-circle-outline' },
  ],
  PICKUP: [
    { status: 'PENDING', label: '주문 접수', icon: 'receipt-text-outline' },
    { status: 'ACCEPTED', label: '조리중', icon: 'chef-hat' },
    { status: 'READY', label: '픽업 가능', icon: 'shopping-outline' },
    { status: 'COMPLETED', label: '픽업 완료', icon: 'check-circle-outline' },
  ],
};

/** 주문 상세: 진행 단계 트래커(Realtime) · 영수증 · 배달/결제 정보 · 접수대기 취소 */
const OrderDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { orderId } = route.params;
  const { confirm } = useDialog();
  const [order, setOrder] = useState<Order | null>(null);
  const [storePhone, setStorePhone] = useState('');

  const load = useCallback(() => {
    getOrder(orderId).then((res) => {
      if (isOk(res) && res.order) {
        setOrder(res.order);
        getStore(res.order.storeId).then((s) => isOk(s) && s.store && setStorePhone(s.store.phone));
      }
    });
  }, [orderId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useEffect(() => {
    const unsub = subscribeMyOrders((id) => {
      if (id === orderId) load();
    });
    return unsub;
  }, [orderId, load]);

  const cancel = async () => {
    if (!order) return;
    const yes = await confirm({
      title: '주문 취소',
      message1: '가게가 접수하기 전이라 바로 취소할 수 있어요.',
      message2: '결제는 자동으로 취소돼요. 취소할까요?',
      confirmText: '주문 취소',
      cancelText: '닫기',
    });
    if (!yes) return;
    loadingController.start();
    const res = await cancelMyOrder(order.id);
    loadingController.stop();
    if (isOk(res) && res.order) {
      // 재조회에 실패하면 항목·가게명이 빈 결과가 올 수 있어, 그 부분은 화면에 있던 값을 유지한다
      const next = res.order;
      setOrder((prev) => (prev ? { ...next, items: next.items.length ? next.items : prev.items, storeName: next.storeName || prev.storeName } : next));
      Toast.show({ type: 'success', text1: '주문을 취소했어요' });
    } else Toast.show({ type: 'error', text1: '취소하지 못했어요', text2: res.resultMsg });
  };

  if (!order) {
    return (
      <ScreenWrapper backgroundColor={theme.colors.bg}>
        <View style={{ padding: 20 }}>
          <SkeletonList rows={4} />
        </View>
      </ScreenWrapper>
    );
  }

  const st = ORDER_STATUS[order.status];
  const closed = order.status === 'REJECTED' || order.status === 'CANCELED';
  const steps = STEPS[order.orderType];
  const stepIdx = steps.findIndex((s) => s.status === order.status);
  const currentIdx = order.status === 'COMPLETED' ? steps.length - 1 : stepIdx;
  const eta =
    order.status === 'ACCEPTED' && order.cookingMinutes && order.acceptedAt
      ? new Date(
          new Date(order.acceptedAt).getTime() +
            (order.cookingMinutes + (order.orderType === 'DELIVERY' ? 15 : 0)) * 60000,
        )
      : null;

  return (
    <ScreenWrapper backgroundColor={theme.colors.bg}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* 상태 */}
        <View style={styles.card}>
          <View style={styles.topRow}>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <Badge label={ORDER_TYPE[order.orderType].label} tone={ORDER_TYPE[order.orderType].tone} size="medium" />
              <Badge label={st.label} tone={st.tone} size="medium" />
            </View>
            <Typography mode="caption1" color="gray500">
              {order.orderNo}
            </Typography>
          </View>
          <Typography mode="heading3" color={closed ? 'red600' : 'gray900'} style={{ marginTop: 16 }}>
            {closed ? st.label : st.desc}
          </Typography>
          {closed ? (
            <Typography mode="body2" color="gray600">
              {order.rejectReason ? `사유: ${order.rejectReason}` : st.desc}
            </Typography>
          ) : (
            eta && (
              <Typography mode="body2" color="gray600">
                예상 {order.orderType === 'DELIVERY' ? '도착' : '픽업 가능'} {timeOnly(eta.toISOString())}쯤
              </Typography>
            )
          )}

          {!closed && (
            <View style={styles.tracker}>
              {steps.map((s, i) => {
                const done = i <= currentIdx;
                const cur = i === currentIdx;
                return (
                  <View key={s.status} style={styles.step}>
                    <View style={[styles.stepIcon, done && styles.stepIconDone, cur && styles.stepIconCur]}>
                      <MaterialCommunityIcons
                        name={s.icon}
                        size={18}
                        color={done ? theme.colors.white : theme.colors.gray400}
                      />
                    </View>
                    <Typography mode="caption1" color={cur ? 'orange700' : done ? 'gray900' : 'gray400'}>
                      {s.label}
                    </Typography>
                    {i < steps.length - 1 && <View style={[styles.stepLine, i < currentIdx && styles.stepLineDone]} />}
                  </View>
                );
              })}
            </View>
          )}

          {order.status === 'PENDING' && (
            <View style={{ marginTop: 12 }}>
              <SecondaryButton label="주문 취소" size="md" onPress={cancel} />
            </View>
          )}
        </View>

        {/* 가게 */}
        <View style={styles.card}>
          <View style={styles.topRow}>
            {/* 누르는 범위는 "가게명 >"까지. flex: 1 을 주면 전화 버튼 앞 빈 공간까지 눌린다. 이름이 길면 전화 버튼을 밀지 않고 줄어든다 */}
            <Pressable
              onPress={() => navigation.navigate('StoreDetail', { storeId: order.storeId })}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1, marginRight: 12 }}>
              <Typography mode="subtitle1" color="gray900" numberOfLines={1} style={{ flexShrink: 1 }}>
                {order.storeName}
              </Typography>
              <MaterialCommunityIcons name="chevron-right" size={18} color={theme.colors.gray400} />
            </Pressable>
            {!!storePhone && (
              <Pressable onPress={() => Linking.openURL(`tel:${storePhone.replace(/-/g, '')}`)} style={styles.callBtn}>
                <MaterialCommunityIcons name="phone-outline" size={16} color={theme.colors.gray700} />
                <Typography mode="caption1" color="gray700">
                  가게 전화
                </Typography>
              </Pressable>
            )}
          </View>
          <View style={{ gap: 10, marginTop: 16 }}>
            {order.items.map((it) => (
              <View key={it.id} style={{ gap: 2 }}>
                <View style={styles.row}>
                  <Typography mode="subtitle3" color="gray900" style={{ flex: 1 }}>
                    {it.menuName}{' '}
                    <Typography mode="body2" color="gray500">
                      × {it.quantity}
                    </Typography>
                  </Typography>
                  <Typography mode="subtitle3" color="gray900">
                    {won(it.lineAmount)}
                  </Typography>
                </View>
                {it.options.map((o, i) => (
                  <Typography key={i} mode="caption1" color="gray500">
                    └ {o.groupName}: {o.name}
                    {o.price ? ` (+${won(o.price)})` : ''}
                  </Typography>
                ))}
              </View>
            ))}
            <View style={styles.divider} />
            <Row label="상품 금액" value={won(order.itemsAmount)} />
            {order.orderType === 'DELIVERY' && <Row label="배달비" value={won(order.deliveryFee)} />}
            <Row label="총 결제금액" value={won(order.totalAmount)} strong />
          </View>
        </View>

        {/* 정보 */}
        <View style={styles.card}>
          <Typography mode="subtitle3" color="gray500" style={{ marginBottom: 10 }}>
            {order.orderType === 'DELIVERY' ? '배달 정보' : '픽업 정보'}
          </Typography>
          <View style={{ gap: 8 }}>
            {order.orderType === 'DELIVERY' && (
              <Info label="주소" value={`${order.address ?? ''} ${order.addressDetail ?? ''}`.trim()} />
            )}
            <Info label="요청사항" value={order.requestMemo || '없음'} />
            <Info label="결제수단" value={order.cardLabel ?? '카드'} />
            <Info label="주문 시각" value={dateTime(order.createdAt)} />
            {order.completedAt && <Info label="완료 시각" value={dateTime(order.completedAt)} />}
          </View>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
};

const Row: React.FC<{ label: string; value: string; strong?: boolean }> = ({ label, value, strong }) => (
  <View style={styles.row}>
    <Typography mode={strong ? 'subtitle2' : 'body2'} color={strong ? 'gray900' : 'gray600'}>
      {label}
    </Typography>
    <Typography mode={strong ? 'subtitle1' : 'body2'} color={strong ? 'orange600' : 'gray900'}>
      {value}
    </Typography>
  </View>
);

const Info: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={{ flexDirection: 'row', gap: 8 }}>
    <Typography mode="body2" color="gray500" style={{ width: 72 }}>
      {label}
    </Typography>
    <Typography mode="body2" color="gray900" style={{ flex: 1 }}>
      {value}
    </Typography>
  </View>
);

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingTop: screen.topCard, gap: 12, paddingBottom: 32 },
  card: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.lg,
    padding: 16,
    boxShadow: theme.shadow.card,
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tracker: { flexDirection: 'row', marginTop: 24, marginBottom: 12 },
  step: { flex: 1, alignItems: 'center', gap: 6, position: 'relative' },
  stepIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  stepIconDone: { backgroundColor: theme.colors.orange300 },
  stepIconCur: { backgroundColor: theme.colors.primary, boxShadow: theme.shadow.primary },
  stepLine: {
    position: 'absolute',
    top: 17,
    left: '50%',
    right: '-50%',
    height: 2,
    backgroundColor: theme.colors.gray100,
  },
  stepLineDone: { backgroundColor: theme.colors.orange300 },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    height: 30,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.gray100,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 },
  divider: { height: 1, backgroundColor: theme.colors.line },
});

export default OrderDetailScreen;

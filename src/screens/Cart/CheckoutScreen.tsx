import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import type { RootStackParamList } from '@typ/navigation';
import type { Address, OrderType, PaymentMethod, Store } from '@typ/domain';
import { getStore } from '@apis/catalogApi';
import { getAddresses, getPaymentMethods } from '@apis/customerApi';
import { placeOrder } from '@apis/orderApi';
import { isOk } from '@apis/client';
import { useCart } from '@contexts/CartContext';
import { useSession } from '@contexts/SessionContext';
import { useDialog } from '@contexts/DialogContext';
import { REQUEST_PRESETS } from '@dt/constants';
import { phone as fmtPhone, won } from '@utils/formatter';
import { resetToOrderComplete } from '@utils/navigationHelpers';
import { Badge, BOTTOM_BTN_BOX_HEIGHT, BottomBtnBox, BottomSheet, KeyboardAwareScrollView, ScreenWrapper, Textarea, Typography } from '@components/common';
import { theme } from '@styles';

type Props = NativeStackScreenProps<RootStackParamList, 'Checkout'>;

const Section: React.FC<{ title: string; action?: { label: string; onPress: () => void }; children: React.ReactNode }> = ({ title, action, children }) => (
  <View style={styles.card}>
    <View style={styles.cardHead}>
      <Typography mode="subtitle2" color="gray900">
        {title}
      </Typography>
      {action && (
        <Pressable onPress={action.onPress} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Typography mode="subtitle4" color="orange700">
            {action.label}
          </Typography>
          <MaterialCommunityIcons name="chevron-right" size={16} color={theme.colors.orange700} />
        </Pressable>
      )}
    </View>
    {children}
  </View>
);

/**
 * 주문하기: 배달 주소(또는 픽업 장소) · 주문자 · 요청사항 · 결제수단 · 금액.
 * 배달/포장은 장바구니 화면에서 이미 정해져 오므로 여기서는 고른 쪽의 내용만 보여준다.
 * "결제하기"를 누르면 모의 결제창(시트)이 뜨고, 승인되면 place_order 로 주문이 만들어진다.
 */
const CheckoutScreen: React.FC<Props> = ({ navigation, route }) => {
  /** 배달 주소 선택 화면에서 고르고 돌아온 주소. 기본 주소보다 우선한다 */
  const pickedAddressId = route.params?.addressId;
  const { cart, itemsAmount, orderType: chosenType, clear } = useCart();
  const { me } = useSession();
  const { alert } = useDialog();
  const [store, setStore] = useState<Store | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [addressId, setAddressId] = useState<string | null>(null);
  const [methodId, setMethodId] = useState<string | null>(null);
  const [memo, setMemo] = useState('');
  const [paying, setPaying] = useState<null | 'processing' | 'approved'>(null);
  const progress = useRef(new Animated.Value(0)).current;

  // 배송지·결제수단은 관리 화면에 다녀오면 바뀔 수 있어 포커스마다 다시 읽는다
  useFocusEffect(
    useCallback(() => {
      getAddresses().then((res) => {
        const list = isOk(res) && res.addresses ? res.addresses : [];
        setAddresses(list);
        // 우선순위: 선택 화면에서 고른 주소 → 지금 고른 주소 → 기본 주소 → 첫 주소 (삭제된 주소는 건너뛴다)
        setAddressId((cur) => {
          const exists = (id?: string | null) => !!id && list.some((a) => a.id === id);
          if (exists(pickedAddressId)) return pickedAddressId!;
          if (exists(cur)) return cur;
          return (list.find((a) => a.isDefault) ?? list[0])?.id ?? null;
        });
      });
      getPaymentMethods().then((res) => {
        const list = isOk(res) && res.methods ? res.methods : [];
        setMethods(list);
        setMethodId((cur) => cur && list.some((m) => m.id === cur) ? cur : (list.find((m) => m.isDefault) ?? list[0])?.id ?? null);
      });
    }, [pickedAddressId]),
  );

  useEffect(() => {
    if (cart) getStore(cart.storeId).then((res) => isOk(res) && res.store && setStore(res.store));
  }, [cart?.storeId]); // eslint-disable-line react-hooks/exhaustive-deps

  // 장바구니에서 고른 값이 가게가 지원하지 않는 쪽이면(그 사이 가게 설정이 바뀐 경우) 지원하는 쪽으로 바로잡는다
  const orderType: OrderType = store && chosenType === 'DELIVERY' && !store.deliveryEnabled ? 'PICKUP' : store && chosenType === 'PICKUP' && !store.pickupEnabled ? 'DELIVERY' : chosenType;

  if (!cart || !me) {
    return <ScreenWrapper backgroundColor={theme.colors.bg}><View /></ScreenWrapper>;
  }

  const address = addresses.find((a) => a.id === addressId) ?? null;
  const method = methods.find((m) => m.id === methodId) ?? null;
  const fee = orderType === 'DELIVERY' ? (store?.deliveryFee ?? 0) : 0;
  const total = itemsAmount + fee;
  const short = store && orderType === 'DELIVERY' ? Math.max(0, store.minOrderAmount - itemsAmount) : 0;
  const canPay = !!store && !!method && (orderType === 'PICKUP' || !!address) && short === 0;

  /** 모의 결제: 결제창 시트 → 1.6초 진행 → 승인 → 서버에 주문 생성 */
  const pay = async () => {
    if (!canPay || paying) return;
    setPaying('processing');
    progress.setValue(0);
    Animated.timing(progress, { toValue: 1, duration: 1600, useNativeDriver: false }).start();
    await new Promise((r) => setTimeout(r, 1700));

    const res = await placeOrder({ cart, orderType, addressId, paymentMethodId: method!.id, requestMemo: memo.trim() });
    if (!isOk(res) || !res.order) {
      setPaying(null);
      await alert({ title: '결제 실패', message1: res.resultMsg, message2: '결제는 진행되지 않았어요.' });
      return;
    }
    setPaying('approved');
    await new Promise((r) => setTimeout(r, 700));
    clear();
    resetToOrderComplete(navigation, res.order.id);
  };

  return (
    <ScreenWrapper backgroundColor={theme.colors.bg} keyboardBottomInset={BOTTOM_BTN_BOX_HEIGHT}>
      <KeyboardAwareScrollView contentContainerStyle={styles.container} keyboardAccessoryHeight={BOTTOM_BTN_BOX_HEIGHT}>
        {/* 배달 주소 (배달 주문일 때). 배달/포장은 장바구니에서 이미 골랐다 */}
        {orderType === 'DELIVERY' && (
          <Section title={store ? `배달 주소 · ${store.deliveryMinutesMin}~${store.deliveryMinutesMax}분` : '배달 주소'} action={{ label: address ? '변경' : '등록', onPress: () => navigation.navigate('AddressList', { selectMode: true, selectedId: addressId ?? undefined }) }}>
            {address ? (
              <View style={{ gap: 2 }}>
                <Typography mode="body1" color="gray900">
                  {address.roadAddress}
                </Typography>
                <Typography mode="body2" color="gray600">
                  {address.detail}
                  {address.label ? `  (${address.label})` : ''}
                </Typography>
              </View>
            ) : (
              <Typography mode="body2" color="red600">
                배달 받을 주소를 등록해 주세요.
              </Typography>
            )}
            {addresses.length > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 4 }}>
                {addresses.map((a) => (
                  <Pressable key={a.id} onPress={() => setAddressId(a.id)} style={[styles.pick, a.id === addressId && styles.pickOn]}>
                    <Typography mode="caption1" color={a.id === addressId ? 'orange700' : 'gray600'}>
                      {a.label || a.roadAddress}
                    </Typography>
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </Section>
        )}

        {orderType === 'PICKUP' && store && (
          <Section title="픽업 장소">
            <Typography mode="body1" color="gray900">
              {store.name}
            </Typography>
            <Typography mode="body2" color="gray600">
              {store.address} · {fmtPhone(store.phone)}
            </Typography>
          </Section>
        )}

        {/* 주문자 */}
        <Section title="주문자" action={{ label: '수정', onPress: () => navigation.navigate('ProfileEdit') }}>
          <Typography mode="body1" color="gray900">
            {me.name} · {fmtPhone(me.phone)}
          </Typography>
        </Section>

        {/* 요청사항 */}
        <Section title="가게·배달 요청사항">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {REQUEST_PRESETS.map((p) => (
              <Pressable key={p} onPress={() => setMemo(memo === p ? '' : p)} style={[styles.pick, memo === p && styles.pickOn]}>
                <Typography mode="caption1" color={memo === p ? 'orange700' : 'gray600'}>
                  {p}
                </Typography>
              </Pressable>
            ))}
          </ScrollView>
          <Textarea value={memo} setValue={(v) => setMemo(v.slice(0, 200))} height={72} />
        </Section>

        {/* 결제수단 */}
        <Section title="결제수단" action={{ label: method ? '변경' : '등록', onPress: () => navigation.navigate('PaymentMethodList', { selectMode: true }) }}>
          {method ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={styles.cardChip}>
                <MaterialCommunityIcons name="credit-card-outline" size={18} color={theme.colors.white} />
              </View>
              {/* 별칭은 카드번호 옆 배지로. 별칭 유무와 상관없이 한 줄이라 카드를 바꿔도 높이·아이콘 위치가 그대로다 */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
                <Typography mode="body1" color="gray900">
                  {method.brand}카드 **** {method.last4}
                </Typography>
                {!!method.alias && <Badge label={method.alias} tone="gray" />}
              </View>
            </View>
          ) : (
            <Typography mode="body2" color="red600">
              결제수단을 등록해 주세요.
            </Typography>
          )}
          {methods.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 4 }}>
              {methods.map((m) => (
                <Pressable key={m.id} onPress={() => setMethodId(m.id)} style={[styles.pick, m.id === methodId && styles.pickOn]}>
                  <Typography mode="caption1" color={m.id === methodId ? 'orange700' : 'gray600'}>
                    {m.brand} {m.last4}
                  </Typography>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </Section>

        {/* 금액 */}
        <Section title="결제 금액">
          <Row label={`상품 금액 (${cart.items.reduce((s, i) => s + i.quantity, 0)}개)`} value={won(itemsAmount)} />
          <Row label="배달비" value={orderType === 'DELIVERY' ? won(fee) : '포장 주문 · 없음'} />
          <View style={styles.divider} />
          <Row label="총 결제금액" value={won(total)} strong />
          {short > 0 && (
            <Typography mode="caption1" color="red600">
              배달 최소 주문금액까지 {won(short)} 부족해요. 장바구니에서 메뉴를 더 담거나{store?.pickupEnabled ? ' 포장으로 바꿔' : ''} 주세요.
            </Typography>
          )}
        </Section>

        <Typography mode="caption1" color="gray400" style={{ textAlign: 'center' }}>
          이 데모의 결제는 모의 결제입니다. 실제 카드 승인이 일어나지 않아요.
        </Typography>
      </KeyboardAwareScrollView>

      <BottomBtnBox label={`${won(total)} 결제하기`} onPress={pay} disabled={!canPay || !!paying} backgroundColor={theme.colors.bg} />

      {/* 모의 결제창 */}
      <BottomSheet
        visible={paying !== null}
        setVisible={() => {}}
        title="Xoeat Pay"
        content={
          <View style={styles.payBox}>
            {paying === 'approved' ? (
              <MaterialCommunityIcons name="check-circle" size={56} color={theme.colors.green500} />
            ) : (
              <ActivityIndicator size="large" color={theme.colors.primary} />
            )}
            <Typography mode="subtitle1" color="gray900">
              {paying === 'approved' ? '결제가 승인됐어요' : '카드사 승인 요청 중…'}
            </Typography>
            <Typography mode="body2" color="gray600">
              {method?.brand}카드 **** {method?.last4} · {won(total)}
            </Typography>
            <View style={styles.progressTrack}>
              <Animated.View style={[styles.progressBar, { width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
            </View>
          </View>
        }
      />
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

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  card: { backgroundColor: theme.colors.white, borderRadius: theme.radius.lg, padding: 16, gap: 12, boxShadow: theme.shadow.card },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pick: { paddingHorizontal: 12, height: 32, borderRadius: theme.radius.pill, borderWidth: 1, borderColor: theme.colors.line, alignItems: 'center', justifyContent: 'center' },
  pickOn: { borderColor: theme.colors.primary, backgroundColor: theme.colors.orange50 },
  cardChip: { width: 36, height: 36, borderRadius: 10, backgroundColor: theme.colors.gray900, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  divider: { height: 1, backgroundColor: theme.colors.line },
  payBox: { alignItems: 'center', gap: 10, paddingVertical: 16 },
  progressTrack: { width: '100%', height: 6, borderRadius: 3, backgroundColor: theme.colors.gray100, marginTop: 8, overflow: 'hidden' },
  progressBar: { height: '100%', backgroundColor: theme.colors.primary },
});

export default CheckoutScreen;

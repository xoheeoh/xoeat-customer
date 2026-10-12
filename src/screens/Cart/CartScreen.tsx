import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import type { RootStackParamList } from '@typ/navigation';
import type { CartItem, OrderType, Store } from '@typ/domain';
import { getStore } from '@apis/catalogApi';
import { isOk } from '@apis/client';
import { useCart } from '@contexts/CartContext';
import { useDialog } from '@contexts/DialogContext';
import { won } from '@utils/formatter';
import { BOTTOM_BTN_BOX_HEIGHT, BottomBtnBox, InfoBox, QuantityStepper, ScreenWrapper, TextButton, Typography } from '@components/common';
import { nudgeUp, rowBaseline, rowBetween, screen, theme } from '@styles';
import { CartItemEditSheet } from './CartItemEditSheet';

type Props = NativeStackScreenProps<RootStackParamList, 'Cart'>;

/**
 * 장바구니: 배달/포장 선택, 수량 변경·삭제, 메뉴를 눌러 옵션 수정(바텀시트), 금액 합계, 최소주문금액 안내.
 * 배달/포장은 여기서 정하고 주문 화면은 그 결과만 보여준다. 가게가 둘 다 지원할 때만 선택 버튼이 보이고, 하나만 지원하면 그걸로 자동 지정된다.
 */
const CartScreen: React.FC<Props> = ({ navigation }) => {
  const { cart, itemsAmount, orderType, setOrderType, setQuantity, remove, clear } = useCart();
  const { confirm } = useDialog();
  const [store, setStore] = useState<Store | null>(null);
  /** 옵션을 수정 중인 항목. null 이면 시트 닫힘 */
  const [editing, setEditing] = useState<CartItem | null>(null);

  useEffect(() => {
    if (cart) getStore(cart.storeId).then((res) => isOk(res) && res.store && setStore(res.store));
  }, [cart?.storeId]); // eslint-disable-line react-hooks/exhaustive-deps

  // 가게가 한쪽만 지원하면 선택지 없이 그쪽으로 맞춘다 (고른 값이 지원되지 않는 쪽이면 바로잡는다)
  const canChoose = !!store && store.deliveryEnabled && store.pickupEnabled;
  useEffect(() => {
    if (!store) return;
    // 둘 다 막힌 가게면 바로잡을 곳이 없다. 이 검사가 없으면 배달↔포장을 무한히 오간다
    if (!store.deliveryEnabled && !store.pickupEnabled) return;
    if (orderType === 'DELIVERY' && !store.deliveryEnabled) setOrderType('PICKUP');
    if (orderType === 'PICKUP' && !store.pickupEnabled) setOrderType('DELIVERY');
  }, [store, orderType, setOrderType]);

  const clearAll = async () => {
    const yes = await confirm({ title: '장바구니 비우기', message1: '담은 메뉴를 모두 지울까요?', confirmText: '비우기', cancelText: '취소' });
    if (yes) clear();
  };

  if (!cart) {
    return (
      <ScreenWrapper backgroundColor={theme.colors.bg}>
        <View style={styles.empty}>
          <MaterialCommunityIcons name="cart-outline" size={48} color={theme.colors.gray300} />
          <Typography mode="body1" color="gray500">
            장바구니가 비어 있어요
          </Typography>
          <TextButton label="가게 둘러보기" onPress={() => navigation.navigate('Main', { screen: 'Home' })} />
        </View>
      </ScreenWrapper>
    );
  }

  const isDelivery = orderType === 'DELIVERY';
  const fee = isDelivery ? (store?.deliveryFee ?? 0) : 0;
  // 최소 주문금액은 배달에만 적용된다
  const short = store && isDelivery ? Math.max(0, store.minOrderAmount - itemsAmount) : 0;

  return (
    <ScreenWrapper backgroundColor={theme.colors.bg}>
      <ScrollView contentContainerStyle={[styles.container, { paddingBottom: BOTTOM_BTN_BOX_HEIGHT + 24 }]}>
        {/* 배달/포장 선택. 가게가 둘 다 지원할 때만 보인다 */}
        {canChoose && (
          <View style={styles.card}>
            <Typography mode="subtitle2" color="gray900">
              주문 방식
            </Typography>
            <View style={styles.typeRow}>
              {(['DELIVERY', 'PICKUP'] as OrderType[]).map((t) => {
                const on = orderType === t;
                return (
                  <Pressable key={t} onPress={() => setOrderType(t)} style={[styles.typeChip, on && styles.typeChipOn]} accessibilityRole="radio" accessibilityState={{ checked: on }}>
                    <MaterialCommunityIcons name={t === 'DELIVERY' ? 'moped-outline' : 'shopping-outline'} size={20} color={on ? theme.colors.orange700 : theme.colors.gray500} />
                    <Typography mode="subtitle3" color={on ? 'orange700' : 'gray600'}>
                      {t === 'DELIVERY' ? '배달' : '포장'}
                    </Typography>
                    <Typography mode="caption1" color="gray500">
                      {t === 'DELIVERY' ? `${store.deliveryMinutesMin}~${store.deliveryMinutesMax}분` : '가게 방문'}
                    </Typography>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        <View style={styles.card}>
          <View style={styles.storeRow}>
            {/* 누르는 범위는 "아이콘 가게명 >"까지. flex: 1 을 주면 "전체 삭제" 앞 빈 공간까지 눌린다. 이름이 길면 전체 삭제를 밀지 않고 줄어든다 */}
            <Pressable
              onPress={() => navigation.navigate('StoreDetail', { storeId: cart.storeId })}
              accessibilityRole="button"
              accessibilityLabel={`${cart.storeName} 가게로 이동`}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1, marginRight: 12 }}>
              <MaterialCommunityIcons name="storefront-outline" size={18} color={theme.colors.gray700} style={styles.inlineIcon} />
              <Typography mode="subtitle2" color="gray900" numberOfLines={1} style={{ flexShrink: 1 }}>
                {cart.storeName}
              </Typography>
              <MaterialCommunityIcons name="chevron-right" size={18} color={theme.colors.gray400} style={styles.inlineIcon} />
            </Pressable>
            <Pressable onPress={clearAll} hitSlop={8} accessibilityRole="button">
              <Typography mode="caption1" color="gray500">
                전체 삭제
              </Typography>
            </Pressable>
          </View>

          {cart.items.map((item, i) => (
            <View key={item.key} style={[styles.item, i > 0 && styles.itemBorder]}>
              {/* 메뉴 이름·옵션 영역을 누르면 옵션 수정 시트 */}
              <Pressable onPress={() => setEditing(item)} style={{ flex: 1, gap: 4 }} accessibilityRole="button" accessibilityLabel={`${item.menuName} 옵션 변경`}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                  <Typography mode="subtitle2" color="gray900" style={{ flexShrink: 1 }}>
                    {item.menuName}
                  </Typography>
                  <MaterialCommunityIcons name="chevron-right" size={18} color={theme.colors.gray400} style={styles.inlineIcon} />
                </View>
                {item.options.length > 0 && (
                  <Typography mode="caption1" color="gray500">
                    {item.options.map((o) => `${o.name}${o.price ? ` +${won(o.price)}` : ''}`).join(' · ')}
                  </Typography>
                )}
                <Typography mode="subtitle3" color="gray900">
                  {won(item.unitPrice * item.quantity)}
                </Typography>
              </Pressable>
              {/* 수량 조절이 아래쪽(가격 줄 높이)에 오도록 아래 정렬 */}
              <View style={{ justifyContent: 'flex-end' }}>
                {/* 삭제 버튼은 따로 두지 않는다. 수량 1 에서 빼기 자리가 쓰레기통으로 바뀌어 삭제를 맡는다 */}
                <QuantityStepper size="sm" value={item.quantity} onChange={(q) => setQuantity(item.key, q)} onRemove={() => remove(item.key)} removeLabel={`${item.menuName} 삭제`} />
              </View>
            </View>
          ))}

          <TextButton label="+ 메뉴 더 담기" size="md" onPress={() => navigation.navigate('StoreDetail', { storeId: cart.storeId })} />
        </View>

        <View style={styles.card}>
          <Row label="상품 금액" value={won(itemsAmount)} />
          <Row label="배달비" value={isDelivery ? (store ? won(fee) : '-') : '포장 주문 · 없음'} />
          <View style={styles.divider} />
          <Row label={isDelivery ? '배달 주문 총액' : '포장 주문 총액'} value={won(itemsAmount + fee)} strong />
        </View>

        {/* 문구는 반드시 하나의 문자열로 넘긴다. {식}이 섞인 JSX 는 문자열 배열이 되어 InfoBox 가 작은 글씨 스타일을 입히지 못한다 */}
        {store && short > 0 && (
          <InfoBox icon="alert-circle-outline">
            {`배달 최소 주문금액 ${won(store.minOrderAmount)}까지 ${won(short)} 남았어요.${store.pickupEnabled ? ' 포장 주문은 금액 제한 없이 가능해요.' : ''}`}
          </InfoBox>
        )}
        {store && !store.isOpenNow && (
          <InfoBox icon="store-clock-outline">
            지금은 가게가 주문을 받지 않는 시간이에요. 영업시간에 다시 주문해 주세요.
          </InfoBox>
        )}
      </ScrollView>

      {/* 배달인데 최소 주문금액을 못 채웠으면 넘어가지 못하게 막는다 (포장은 금액 제한 없음) */}
      <BottomBtnBox
        label={short > 0 ? `${won(short)} 더 담으면 배달 주문 가능` : `${won(itemsAmount + fee)} ${isDelivery ? '배달' : '포장'} 주문하기`}
        onPress={() => navigation.navigate('Checkout')}
        disabled={!store || !store.isOpenNow || short > 0}
        backgroundColor={theme.colors.bg}
      />

      <CartItemEditSheet item={editing} onClose={() => setEditing(null)} />
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
  container: { paddingHorizontal: 16, paddingTop: screen.topCard, gap: 12 },
  card: { backgroundColor: theme.colors.white, borderRadius: theme.radius.lg, padding: 16, gap: 12, boxShadow: theme.shadow.card },
  // 배달/포장 선택 버튼
  typeRow: { flexDirection: 'row', gap: 10 },
  typeChip: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 12, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.line },
  typeChipOn: { borderColor: theme.colors.primary, backgroundColor: theme.colors.orange50 },
  storeRow: rowBetween,
  // 글자(subtitle2) 옆에 놓는 18px 아이콘
  inlineIcon: nudgeUp,
  item: { flexDirection: 'row', gap: 12, paddingVertical: 4 },
  itemBorder: { borderTopWidth: 1, borderTopColor: theme.colors.gray100, paddingTop: 12 },
  row: rowBaseline,
  divider: { height: 1, backgroundColor: theme.colors.line },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
});

export default CartScreen;

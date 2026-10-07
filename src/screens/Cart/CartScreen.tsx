import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import type { RootStackParamList } from '@typ/navigation';
import type { CartItem, Store } from '@typ/domain';
import { getStore } from '@apis/catalogApi';
import { isOk } from '@apis/client';
import { useCart } from '@contexts/CartContext';
import { useDialog } from '@contexts/DialogContext';
import { won } from '@utils/formatter';
import { BOTTOM_BTN_BOX_HEIGHT, BottomBtnBox, InfoBox, ScreenWrapper, TextButton, Typography } from '@components/common';
import { theme } from '@styles';
import { CartItemEditSheet } from './CartItemEditSheet';

type Props = NativeStackScreenProps<RootStackParamList, 'Cart'>;

/** 장바구니: 수량 변경·삭제, 메뉴를 눌러 옵션 수정(바텀시트), 금액 합계, 최소주문금액 안내 */
const CartScreen: React.FC<Props> = ({ navigation }) => {
  const { cart, itemsAmount, setQuantity, remove, clear } = useCart();
  const { confirm } = useDialog();
  const [store, setStore] = useState<Store | null>(null);
  /** 옵션을 수정 중인 항목. null 이면 시트 닫힘 */
  const [editing, setEditing] = useState<CartItem | null>(null);

  useEffect(() => {
    if (cart) getStore(cart.storeId).then((res) => isOk(res) && res.store && setStore(res.store));
  }, [cart?.storeId]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const short = store ? Math.max(0, store.minOrderAmount - itemsAmount) : 0;

  return (
    <ScreenWrapper backgroundColor={theme.colors.bg}>
      <ScrollView contentContainerStyle={[styles.container, { paddingBottom: BOTTOM_BTN_BOX_HEIGHT + 24 }]}>
        <View style={styles.card}>
          <View style={styles.storeRow}>
            <Pressable onPress={() => navigation.navigate('StoreDetail', { storeId: cart.storeId })} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 }}>
              <MaterialCommunityIcons name="storefront-outline" size={18} color={theme.colors.gray700} style={styles.inlineIcon} />
              <Typography mode="subtitle2" color="gray900">
                {cart.storeName}
              </Typography>
              <MaterialCommunityIcons name="chevron-right" size={18} color={theme.colors.gray400} style={styles.inlineIcon} />
            </Pressable>
            <Pressable onPress={clearAll} hitSlop={8}>
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
              <View style={{ alignItems: 'flex-end', gap: 8 }}>
                <Pressable onPress={() => remove(item.key)} hitSlop={8}>
                  <MaterialCommunityIcons name="close" size={18} color={theme.colors.gray400} />
                </Pressable>
                <View style={styles.stepper}>
                  <Pressable onPress={() => (item.quantity > 1 ? setQuantity(item.key, item.quantity - 1) : remove(item.key))} style={styles.stepBtn} hitSlop={6}>
                    <MaterialCommunityIcons name={item.quantity > 1 ? 'minus' : 'trash-can-outline'} size={18} color={theme.colors.gray700} />
                  </Pressable>
                  <Typography mode="subtitle3" color="gray900" style={{ minWidth: 24, textAlign: 'center' }}>
                    {item.quantity}
                  </Typography>
                  <Pressable onPress={() => setQuantity(item.key, item.quantity + 1)} style={styles.stepBtn} hitSlop={6}>
                    <MaterialCommunityIcons name="plus" size={18} color={theme.colors.gray700} />
                  </Pressable>
                </View>
              </View>
            </View>
          ))}

          <TextButton label="+ 메뉴 더 담기" size="md" onPress={() => navigation.navigate('StoreDetail', { storeId: cart.storeId })} />
        </View>

        <View style={styles.card}>
          <Row label="상품 금액" value={won(itemsAmount)} />
          <Row label="배달비 (배달 주문 시)" value={store ? won(store.deliveryFee) : '-'} />
          <View style={styles.divider} />
          <Row label="배달 주문 총액" value={won(itemsAmount + (store?.deliveryFee ?? 0))} strong />
        </View>

        {store && short > 0 && (
          <InfoBox tone="yellow" icon="alert-circle-outline">
            배달 최소 주문금액 {won(store.minOrderAmount)}까지 {won(short)} 남았어요. 포장 주문은 금액 제한 없이 가능해요.
          </InfoBox>
        )}
        {store && !store.isOpenNow && (
          <InfoBox tone="yellow" icon="store-clock-outline">
            지금은 가게가 주문을 받지 않는 시간이에요. 영업시간에 다시 주문해 주세요.
          </InfoBox>
        )}
      </ScrollView>

      <BottomBtnBox label={`${won(itemsAmount)} 주문하기`} onPress={() => navigation.navigate('Checkout')} disabled={!store || !store.isOpenNow} backgroundColor={theme.colors.bg} />

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
  container: { padding: 16, gap: 12 },
  card: { backgroundColor: theme.colors.white, borderRadius: theme.radius.lg, padding: 16, gap: 12, boxShadow: theme.shadow.card },
  storeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  // 글자(subtitle2, 줄높이 24) 옆에 놓는 18px 아이콘. 상자 기준으로는 가운데지만 아이콘 글리프가 상자 안에서 살짝 아래에 그려져 1px 올린다.
  // margin 으로 올리면 가운데 정렬 때문에 절반만 움직이므로 위치 이동(translateY)을 쓴다
  inlineIcon: { transform: [{ translateY: -1 }] },
  item: { flexDirection: 'row', gap: 12, paddingVertical: 4 },
  itemBorder: { borderTopWidth: 1, borderTopColor: theme.colors.gray100, paddingTop: 12 },
  stepper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: theme.colors.line, borderRadius: theme.radius.sm },
  stepBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  divider: { height: 1, backgroundColor: theme.colors.line },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
});

export default CartScreen;

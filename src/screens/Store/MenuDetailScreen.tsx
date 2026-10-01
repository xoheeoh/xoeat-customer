import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

import type { RootStackParamList } from '@typ/navigation';
import type { CartItem, Menu, Option, OptionGroup, Store } from '@typ/domain';
import { getMenu, getStore } from '@apis/catalogApi';
import { isOk } from '@apis/client';
import { useCart } from '@contexts/CartContext';
import { useDialog } from '@contexts/DialogContext';
import { won } from '@utils/formatter';
import { Badge, BOTTOM_BTN_BOX_HEIGHT, BottomBtnBox, ScreenWrapper, SkeletonList, Typography } from '@components/common';
import { theme } from '@styles';

type Props = NativeStackScreenProps<RootStackParamList, 'MenuDetail'>;

/** 메뉴 상세: 옵션 그룹(필수=라디오, 선택=체크, 최소/최대) · 수량 · 장바구니 담기 */
const MenuDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { storeId, menuId } = route.params;
  const { add, cart } = useCart();
  const { confirm, alert } = useDialog();
  const [menu, setMenu] = useState<Menu | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [selected, setSelected] = useState<Record<string, string[]>>({}); // groupId → optionIds
  const [qty, setQty] = useState(1);

  useEffect(() => {
    getMenu(menuId).then((res) => isOk(res) && res.menu && setMenu(res.menu));
    getStore(storeId).then((res) => isOk(res) && res.store && setStore(res.store));
  }, [menuId, storeId]);

  const toggle = (g: OptionGroup, o: Option) => {
    if (o.soldOut) return;
    setSelected((prev) => {
      const cur = prev[g.id] ?? [];
      if (g.maxSelect === 1) return { ...prev, [g.id]: cur.includes(o.id) && !g.required ? [] : [o.id] };
      if (cur.includes(o.id)) return { ...prev, [g.id]: cur.filter((id) => id !== o.id) };
      if (cur.length >= g.maxSelect) {
        Toast.show({ type: 'error', text1: `${g.name}은(는) 최대 ${g.maxSelect}개까지 선택할 수 있어요` });
        return prev;
      }
      return { ...prev, [g.id]: [...cur, o.id] };
    });
  };

  const missing = useMemo(() => (menu?.optionGroups ?? []).filter((g) => g.required && (selected[g.id]?.length ?? 0) < g.minSelect), [menu, selected]);

  const chosen = useMemo(() => {
    if (!menu) return [];
    return menu.optionGroups.flatMap((g) => g.options.filter((o) => (selected[g.id] ?? []).includes(o.id)).map((o) => ({ id: o.id, groupName: g.name, name: o.name, price: o.price })));
  }, [menu, selected]);

  const unitPrice = (menu?.price ?? 0) + chosen.reduce((s, o) => s + o.price, 0);
  const soldOut = menu?.saleStatus !== 'ON_SALE';
  const closed = store ? !store.isOpenNow : false;

  const addToCart = async () => {
    if (!menu || !store) return;
    if (missing.length) {
      await alert({ title: '옵션 선택', message1: `${missing[0].name}을(를) 선택해 주세요.` });
      return;
    }
    if (menu.adultOnly) {
      const ok = await confirm({ title: '성인 인증', message1: '주류 등 미성년자에게 판매할 수 없는 메뉴예요.', message2: '배달 시 신분증 확인이 필요하며, 미성년자로 확인되면 주문이 취소돼요. 성인이 맞나요?', confirmText: '네, 성인이에요', cancelText: '취소' });
      if (!ok) return;
    }
    const item: CartItem = {
      key: `${menu.id}:${chosen.map((o) => o.id).sort().join(',')}`,
      menuId: menu.id,
      menuName: menu.name,
      basePrice: menu.price,
      unitPrice,
      quantity: qty,
      options: chosen,
      adultOnly: menu.adultOnly,
    };
    let ok = add({ id: store.id, name: store.name }, item);
    if (!ok) {
      const replace = await confirm({
        title: '장바구니에 다른 가게 메뉴가 있어요',
        message1: `${cart?.storeName}의 메뉴를 비우고 ${store.name}의 메뉴를 담을까요?`,
        message2: '한 번에 한 가게에서만 주문할 수 있어요.',
        confirmText: '비우고 담기',
        cancelText: '취소',
      });
      if (!replace) return;
      ok = add({ id: store.id, name: store.name }, item, true);
    }
    if (ok) {
      Toast.show({ type: 'success', text1: '장바구니에 담았어요', text2: `${menu.name} ${qty}개` });
      navigation.goBack();
    }
  };

  if (!menu) {
    return (
      <ScreenWrapper backgroundColor="white">
        <View style={{ padding: 20 }}>
          <SkeletonList rows={4} />
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper backgroundColor="white" keyboardBottomInset={BOTTOM_BTN_BOX_HEIGHT}>
      <ScrollView contentContainerStyle={{ paddingBottom: BOTTOM_BTN_BOX_HEIGHT + 24 }}>
        {menu.imageUrl ? (
          <Image source={{ uri: menu.imageUrl }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.imageEmpty]}>
            <MaterialCommunityIcons name="food" size={48} color={theme.colors.gray300} />
          </View>
        )}

        <View style={styles.head}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Typography mode="heading2" color="gray900" style={{ flexShrink: 1 }}>
              {menu.name}
            </Typography>
            {menu.adultOnly && <Badge label="19" tone="red" size="medium" />}
            {soldOut && <Badge label="품절" tone="gray" size="medium" />}
          </View>
          {!!menu.description && (
            <Typography mode="body2" color="gray600">
              {menu.description}
            </Typography>
          )}
          <View style={styles.priceRow}>
            {!!menu.standard && (
              <Typography mode="caption1" color="gray500">
                {menu.standard}
              </Typography>
            )}
            <Typography mode="heading3" color="gray900">
              {won(menu.price)}
            </Typography>
          </View>
        </View>

        {menu.optionGroups.map((g) => (
          <View key={g.id} style={styles.group}>
            <View style={styles.groupHead}>
              <Typography mode="subtitle1" color="gray900">
                {g.name}
              </Typography>
              <Badge label={g.required ? `필수 · ${g.minSelect === g.maxSelect ? `${g.minSelect}개` : `${g.minSelect}~${g.maxSelect}개`}` : `선택 · 최대 ${g.maxSelect}개`} tone={g.required ? 'orange' : 'gray'} />
            </View>
            {g.options.map((o) => {
              const on = (selected[g.id] ?? []).includes(o.id);
              return (
                <Pressable key={o.id} onPress={() => toggle(g, o)} style={styles.option} disabled={o.soldOut}>
                  <MaterialCommunityIcons
                    name={g.maxSelect === 1 ? (on ? 'radiobox-marked' : 'radiobox-blank') : on ? 'checkbox-marked' : 'checkbox-blank-outline'}
                    size={22}
                    color={o.soldOut ? theme.colors.gray200 : on ? theme.colors.primary : theme.colors.gray300}
                  />
                  <Typography mode="body1" color={o.soldOut ? 'gray400' : 'gray900'} style={{ flex: 1 }}>
                    {o.name}
                    {o.soldOut ? '  (품절)' : ''}
                  </Typography>
                  <Typography mode="body2" color={o.soldOut ? 'gray400' : 'gray600'}>
                    {o.price ? `+${won(o.price)}` : ''}
                  </Typography>
                </Pressable>
              );
            })}
          </View>
        ))}

        <View style={styles.qtyRow}>
          <Typography mode="subtitle1" color="gray900">
            수량
          </Typography>
          <View style={styles.stepper}>
            <Pressable onPress={() => setQty((q) => Math.max(1, q - 1))} style={styles.stepBtn} hitSlop={6}>
              <MaterialCommunityIcons name="minus" size={20} color={qty > 1 ? theme.colors.gray900 : theme.colors.gray300} />
            </Pressable>
            <Typography mode="subtitle1" color="gray900" style={{ minWidth: 28, textAlign: 'center' }}>
              {qty}
            </Typography>
            <Pressable onPress={() => setQty((q) => Math.min(99, q + 1))} style={styles.stepBtn} hitSlop={6}>
              <MaterialCommunityIcons name="plus" size={20} color={theme.colors.gray900} />
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <BottomBtnBox
        label={soldOut ? '품절된 메뉴예요' : closed ? '지금은 주문할 수 없어요' : `${won(unitPrice * qty)} 담기`}
        onPress={addToCart}
        disabled={soldOut || closed}
      />
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  image: { width: '100%', height: 220, backgroundColor: theme.colors.gray100 },
  imageEmpty: { alignItems: 'center', justifyContent: 'center' },
  head: { padding: 20, gap: 8, borderBottomWidth: 8, borderBottomColor: theme.colors.gray50 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 4 },
  group: { paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 8, borderBottomColor: theme.colors.gray50 },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: theme.colors.line, borderRadius: theme.radius.md, padding: 4 },
  stepBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
});

export default MenuDetailScreen;

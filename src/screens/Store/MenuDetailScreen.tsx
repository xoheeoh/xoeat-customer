import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, Pressable, StyleSheet, View } from 'react-native';
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
import { Badge, BOTTOM_BTN_BOX_HEIGHT, BottomBtnBox, CheckBox, NavIconButton, RadioIndicator, ScreenWrapper, SkeletonList, Typography, useRadioBounce } from '@components/common';
import { theme } from '@styles';

type Props = NativeStackScreenProps<RootStackParamList, 'MenuDetail'>;

/** 화면 맨 위에 떠 있는 바(뒤로 버튼)의 높이. 공통 Header 와 같은 56 */
const HEADER_HEIGHT = 56;
/** 메뉴 이미지 높이 */
const IMAGE_HEIGHT = 240;

/**
 * 메뉴 상세: 옵션 그룹(필수=라디오, 선택=체크, 최소/최대) · 수량 · 장바구니 담기
 *
 * 상단 바는 이미지 위에 투명하게 떠 있고(뒤로 버튼만 보임), 스크롤해서 이미지가 지나가면 흰 배경이 서서히 진해지며 메뉴 이름이 제목으로 뜬다.
 * 가게 상세 화면과 같은 방식이다.
 */
const MenuDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { storeId, menuId } = route.params;
  const { add, cart } = useCart();
  const { confirm, alert } = useDialog();
  const [menu, setMenu] = useState<Menu | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [selected, setSelected] = useState<Record<string, string[]>>({}); // groupId → optionIds
  const [qty, setQty] = useState(1);

  // 스크롤 위치에 따라 상단 바 흰 배경·제목의 불투명도를 연속적으로 바꾼다. 이미지 아랫변이 상단 바에 닿기 48px 전부터 시작해 닿는 순간 완전히 흰색
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerOpacity = scrollY.interpolate({
    inputRange: [IMAGE_HEIGHT - HEADER_HEIGHT - 48, IMAGE_HEIGHT - HEADER_HEIGHT],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const onScroll = Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false });

  /** 상단 바. 흰 배경과 제목은 스크롤에 따라 나타나고, 뒤로 버튼은 항상 보인다 */
  const header = (
    <View style={styles.header}>
      <Animated.View pointerEvents="none" style={[styles.headerBg, { opacity: headerOpacity }]} />
      <NavIconButton icon="chevron-left" accessibilityLabel="뒤로" onPress={() => navigation.goBack()} />
      <Animated.View pointerEvents="none" style={[styles.headerTitle, { opacity: headerOpacity }]}>
        <Typography mode="subtitle1" color="gray900" numberOfLines={1}>
          {menu?.name ?? ''}
        </Typography>
      </Animated.View>
      {/* 오른쪽에 버튼이 없어도 제목이 가운데 오도록 같은 크기의 빈 칸 */}
      <View style={styles.headerSpacer} />
    </View>
  );

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
      <ScreenWrapper hasHeader={false} backgroundColor="white">
        <View style={{ flex: 1 }}>
          <View style={[styles.image, styles.imageEmpty]} />
          <View style={{ padding: 20 }}>
            <SkeletonList rows={4} />
          </View>
          {header}
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper hasHeader={false} backgroundColor="white" keyboardBottomInset={BOTTOM_BTN_BOX_HEIGHT}>
      <View style={{ flex: 1 }}>
        <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} contentContainerStyle={{ paddingBottom: BOTTOM_BTN_BOX_HEIGHT + 24 }}>
          {/* 이미지는 상단 바 뒤까지 올라가 있다 */}
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
                const label = (
                  <Typography mode="body2" color={o.soldOut ? 'gray400' : 'gray900'} style={styles.optionLabel} numberOfLines={2}>
                    {o.name}
                    {o.soldOut ? '  (품절)' : ''}
                  </Typography>
                );
                // 누르는 범위는 "표시(라디오/체크) + 라벨"까지. 빈 공간과 오른쪽 금액은 눌러도 반응하지 않는다.
                // 모양은 공통 Radio / CheckBox 부품과 같다 (사장님 앱과 동일). 체크박스는 누를 때 튕기는 효과까지 그대로
                return (
                  <View key={o.id} style={styles.option}>
                    {g.maxSelect === 1 ? (
                      <OptionRadio selected={on} disabled={o.soldOut} onPress={() => toggle(g, o)}>
                        {label}
                      </OptionRadio>
                    ) : (
                      <CheckBox isChecked={on} setIsChecked={() => toggle(g, o)} disabled={o.soldOut} style={styles.optionPress} labelComponent={label} />
                    )}
                    <Typography mode="body2" color={o.soldOut ? 'gray400' : 'gray600'}>
                      {o.price ? `+${won(o.price)}` : ''}
                    </Typography>
                  </View>
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
        </Animated.ScrollView>

        {header}

        <BottomBtnBox
          label={soldOut ? '품절된 메뉴예요' : closed ? '지금은 주문할 수 없어요' : `${won(unitPrice * qty)} 담기`}
          onPress={addToCart}
          disabled={soldOut || closed}
        />
      </View>
    </ScreenWrapper>
  );
};

/** 라디오 옵션의 누르는 영역(동그라미 + 라벨). 줄마다 눌림 효과 값을 따로 가져야 해서 컴포넌트로 분리했다 */
const OptionRadio: React.FC<{ selected: boolean; disabled: boolean; onPress: () => void; children: React.ReactNode }> = ({ selected, disabled, onPress, children }) => {
  const bounce = useRadioBounce();
  return (
    <Pressable
      style={styles.optionPress}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled }}
      onPressIn={bounce.onPressIn}
      onPressOut={bounce.onPressOut}
      onPress={() => {
        bounce.onPress();
        onPress();
      }}>
      <RadioIndicator selected={selected} disabled={disabled} style={bounce.style} />
      {children}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  image: { width: '100%', height: IMAGE_HEIGHT, backgroundColor: theme.colors.gray100 },
  imageEmpty: { alignItems: 'center', justifyContent: 'center' },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: HEADER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  // 상단 바 뒤에 깔리는 흰 배경 층. 불투명도만 스크롤에 따라 바뀐다
  headerBg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: theme.colors.white, borderBottomWidth: 1, borderBottomColor: theme.colors.line },
  headerTitle: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  headerSpacer: { width: 40 },
  head: { padding: 20, gap: 8, borderBottomWidth: 8, borderBottomColor: theme.colors.gray50 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 4 },
  group: { paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 8, borderBottomColor: theme.colors.gray50 },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  // 옵션 한 줄: 왼쪽 "표시 + 라벨"(누르는 영역), 오른쪽 금액. 공통 Radio 줄과 같은 높이(48)
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, height: 48 },
  // 누르는 영역. CheckBox 의 기본 간격(8)을 Radio 줄과 같은 10 으로 덮는다. 라벨이 길면 금액 자리를 침범하지 않고 줄어든다
  optionPress: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 48, flexShrink: 1 },
  // 라벨은 Radio 라벨처럼 body2 에서 굵기만 Medium
  optionLabel: { flexShrink: 1, fontFamily: 'Pretendard-Medium' },
  qtyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: theme.colors.line, borderRadius: theme.radius.md, padding: 4 },
  stepBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
});

export default MenuDetailScreen;

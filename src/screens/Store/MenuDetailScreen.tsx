import { useEffect, useRef, useState } from 'react';
import { Animated, Image, Pressable, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

import type { RootStackParamList } from '@typ/navigation';
import type { Menu, Store } from '@typ/domain';
import { getMenu, getStore } from '@apis/catalogApi';
import { isOk } from '@apis/client';
import { useCart } from '@contexts/CartContext';
import { useDialog } from '@contexts/DialogContext';
import { won } from '@utils/formatter';
import { MenuOptionGroups, toCartItem, useMenuOptionSelection } from '@components/store';
import { AdultBadge, Badge, BOTTOM_BTN_BOX_HEIGHT, BottomBtnBox, NavIconButton, ScreenWrapper, SkeletonList, Typography } from '@components/common';
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
  // 옵션 선택 상태·규칙은 장바구니의 옵션 수정 시트와 같은 훅을 쓴다
  const { selected, toggle, missing, chosen, unitPrice } = useMenuOptionSelection(menu);
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
    const item = toCartItem(menu, chosen, qty);
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
              {/* 큰 제목(heading2) 옆이라 마크도 한 단계 크게 */}
              {menu.adultOnly && <AdultBadge size={24} style={{ transform: [{ translateY: -1 }] }} />}
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

          <MenuOptionGroups groups={menu.optionGroups} selected={selected} onToggle={toggle} />

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
  qtyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: theme.colors.line, borderRadius: theme.radius.md, padding: 4 },
  stepBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
});

export default MenuDetailScreen;

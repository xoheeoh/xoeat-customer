import { useCallback, useMemo, useState } from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import type { RootStackParamList } from '@typ/navigation';
import type { Menu, Store } from '@typ/domain';
import { getStore, getStoreMenus } from '@apis/catalogApi';
import { setFavorite } from '@apis/customerApi';
import { isOk } from '@apis/client';
import { useSession } from '@contexts/SessionContext';
import { useCart } from '@contexts/CartContext';
import { CATEGORIES, DAY_LABELS, categoryLabel } from '@dt/constants';
import { phone as fmtPhone, timeKo, won } from '@utils/formatter';
import { MenuRow } from '@components/store';
import { NavIconButton, ScreenWrapper, SkeletonList, TabBar, Typography } from '@components/common';
import { theme } from '@styles';

type Props = NativeStackScreenProps<RootStackParamList, 'StoreDetail'>;
type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

/** 가게 상세: 상단 정보 · 메뉴 탭(카테고리별) · 가게 정보 탭(영업시간·주소·원산지). 하단에 장바구니 바 */
const StoreDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { storeId } = route.params;
  const { me, favoriteIds, setFavoriteIds } = useSession();
  const { cart, count, itemsAmount } = useCart();
  const [store, setStore] = useState<Store | null>(null);
  const [menus, setMenus] = useState<Menu[] | null>(null);
  const [tab, setTab] = useState<1 | 2>(1);

  useFocusEffect(
    useCallback(() => {
      getStore(storeId, favoriteIds).then((res) => isOk(res) && res.store && setStore(res.store));
      getStoreMenus(storeId).then((res) => setMenus(isOk(res) && res.menus ? res.menus : []));
    }, [storeId, favoriteIds]),
  );

  const sections = useMemo(() => {
    if (!menus) return [];
    const map = new Map<string, Menu[]>();
    menus.forEach((m) => {
      const list = map.get(m.categoryName) ?? [];
      list.push(m);
      map.set(m.categoryName, list);
    });
    return [...map.entries()];
  }, [menus]);

  const toggleFavorite = async () => {
    if (!me || !store) return;
    const on = !store.isFavorite;
    setStore({ ...store, isFavorite: on });
    setFavoriteIds(on ? [...favoriteIds, store.id] : favoriteIds.filter((id) => id !== store.id));
    const res = await setFavorite(store.id, on, me.id);
    if (!isOk(res)) Toast.show({ type: 'error', text1: res.resultMsg });
  };

  const icon = (CATEGORIES.find((c) => c.code === store?.categoryCd)?.icon ?? 'silverware-fork-knife') as IconName;
  const cartIsHere = cart?.storeId === storeId;

  return (
    <ScreenWrapper hasHeader={false} backgroundColor="white">
      {/* 헤더 (이미지 위에 겹친다) */}
      <View style={styles.hero}>
        {store?.imageUrl ? (
          <Image source={{ uri: store.imageUrl }} style={styles.heroImage} />
        ) : (
          <View style={[styles.heroImage, styles.heroEmpty]}>
            <MaterialCommunityIcons name={icon} size={56} color={theme.colors.orange300} />
          </View>
        )}
        <SafeAreaView edges={['top']} style={styles.heroBar}>
          <NavIconButton icon="chevron-left" accessibilityLabel="뒤로" onPress={() => navigation.goBack()} />
          <NavIconButton icon={store?.isFavorite ? 'heart' : 'heart-outline'} accessibilityLabel="찜" onPress={toggleFavorite} />
        </SafeAreaView>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: cart ? 96 : 24 }}>
        <View style={styles.info}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Typography mode="heading2" color="gray900" style={{ flexShrink: 1 }}>
              {store?.name ?? ' '}
            </Typography>
            {store && !store.isOpenNow && (
              <View style={styles.closedPill}>
                <Typography mode="caption2" color="gray600">
                  {store.status === 'PAUSED' ? '잠시 주문 중지' : '준비중'}
                </Typography>
              </View>
            )}
          </View>
          {store && (
            <>
              <Typography mode="body2" color="gray600">
                {store.intro}
              </Typography>
              <View style={styles.metaGrid}>
                <Meta icon="moped-outline" label="배달" value={store.deliveryEnabled ? `${store.deliveryMinutesMin}~${store.deliveryMinutesMax}분 · ${store.deliveryFee ? won(store.deliveryFee) : '무료'}` : '미운영'} />
                <Meta icon="shopping-outline" label="포장" value={store.pickupEnabled ? '가능' : '미운영'} />
                <Meta icon="cash" label="최소주문" value={won(store.minOrderAmount)} />
              </View>
            </>
          )}
        </View>

        <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
          <TabBar active={tab} label1="메뉴" label2="가게 정보" onPress1={() => setTab(1)} onPress2={() => setTab(2)} />
        </View>

        {tab === 1 &&
          (menus === null ? (
            <View style={{ padding: 20 }}>
              <SkeletonList rows={5} />
            </View>
          ) : (
            sections.map(([name, list]) => (
              <View key={name}>
                <Typography mode="subtitle1" color="gray900" style={styles.sectionTitle}>
                  {name}
                </Typography>
                {list.map((m, i) => (
                  <View key={m.id}>
                    <MenuRow menu={m} onPress={() => navigation.navigate('MenuDetail', { storeId, menuId: m.id })} />
                    {i < list.length - 1 && <View style={styles.sep} />}
                  </View>
                ))}
                <View style={styles.sectionGap} />
              </View>
            ))
          ))}

        {tab === 2 && store && (
          <View style={styles.infoTab}>
            <InfoBlock title="영업시간">
              {store.hours.map((h) => (
                <View key={h.dayOfWeek} style={styles.hourRow}>
                  <Typography mode="body2" color="gray600" style={{ width: 32 }}>
                    {DAY_LABELS[h.dayOfWeek]}
                  </Typography>
                  <Typography mode="body2" color={h.enabled ? 'gray900' : 'gray400'}>
                    {h.enabled ? `${timeKo(h.openTime)} ~ ${timeKo(h.closeTime)}${h.breakFrom ? `  (휴게 ${h.breakFrom}~${h.breakTo})` : ''}` : '휴무'}
                  </Typography>
                </View>
              ))}
            </InfoBlock>
            <InfoBlock title="가게 정보">
              <Typography mode="body2" color="gray900">
                {store.address}
              </Typography>
              <Pressable onPress={() => Linking.openURL(`tel:${store.phone.replace(/-/g, '')}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Typography mode="body2" color="blue600">
                  {fmtPhone(store.phone)}
                </Typography>
                <MaterialCommunityIcons name="phone-outline" size={16} color={theme.colors.blue600} />
              </Pressable>
              <Typography mode="caption1" color="gray500">
                업종 {categoryLabel(store.categoryCd)}
              </Typography>
            </InfoBlock>
            {!!store.originInfo && (
              <InfoBlock title="원산지 표시">
                <Typography mode="body2" color="gray700">
                  {store.originInfo}
                </Typography>
              </InfoBlock>
            )}
          </View>
        )}
      </ScrollView>

      {cart && (
        <Pressable style={styles.cartBar} onPress={() => navigation.navigate('Cart')}>
          <View style={styles.cartCount}>
            <Typography mode="subtitle4" color="orange700">
              {count}
            </Typography>
          </View>
          <Typography mode="subtitle2" color="white" style={{ flex: 1 }} numberOfLines={1}>
            {cartIsHere ? `${itemsAmount.toLocaleString('ko-KR')}원` : `${cart.storeName} 장바구니`}
          </Typography>
          <Typography mode="subtitle2" color="white">
            장바구니 보기
          </Typography>
        </Pressable>
      )}
    </ScreenWrapper>
  );
};

const Meta: React.FC<{ icon: IconName; label: string; value: string }> = ({ icon, label, value }) => (
  <View style={styles.meta}>
    <MaterialCommunityIcons name={icon} size={18} color={theme.colors.gray500} />
    <Typography mode="caption1" color="gray500">
      {label}
    </Typography>
    <Typography mode="subtitle4" color="gray900">
      {value}
    </Typography>
  </View>
);

const InfoBlock: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <View style={{ gap: 8 }}>
    <Typography mode="subtitle2" color="gray900">
      {title}
    </Typography>
    {children}
  </View>
);

const styles = StyleSheet.create({
  hero: { position: 'relative' },
  heroImage: { width: '100%', height: 180, backgroundColor: theme.colors.gray100 },
  heroEmpty: { alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.orange50 },
  heroBar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, paddingTop: 8 },
  info: { padding: 20, gap: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.line, marginBottom: 12 },
  closedPill: { backgroundColor: theme.colors.gray100, borderRadius: theme.radius.pill, paddingHorizontal: 8, height: 22, justifyContent: 'center' },
  metaGrid: { flexDirection: 'row', gap: 8, marginTop: 4 },
  meta: { flex: 1, alignItems: 'center', gap: 2, backgroundColor: theme.colors.gray50, borderRadius: theme.radius.md, paddingVertical: 10 },
  sectionTitle: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 },
  sectionGap: { height: 8, backgroundColor: theme.colors.gray50, marginTop: 4 },
  sep: { height: 1, backgroundColor: theme.colors.gray100, marginHorizontal: 20 },
  infoTab: { padding: 20, gap: 24 },
  hourRow: { flexDirection: 'row', gap: 8 },
  cartBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    height: 56,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.gray900,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    boxShadow: theme.shadow.float,
  },
  cartCount: { minWidth: 24, height: 24, borderRadius: 12, backgroundColor: theme.colors.white, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
});

export default StoreDetailScreen;

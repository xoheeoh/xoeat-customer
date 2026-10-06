import { useCallback, useMemo, useState } from 'react';
import { Platform, Pressable, RefreshControl, ScrollView, SectionList, StyleSheet, TextInput, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

import type { RootStackParamList } from '@typ/navigation';
import type { Address, Store } from '@typ/domain';
import { getStores } from '@apis/catalogApi';
import { getAddresses, setFavorite } from '@apis/customerApi';
import { isOk } from '@apis/client';
import { useSession } from '@contexts/SessionContext';
import { useCart } from '@contexts/CartContext';
import { CATEGORIES } from '@dt/constants';
import { StoreCard } from '@components/store';
import { ScreenWrapper, SkeletonList, Typography, typographyStyles } from '@components/common';
import { theme } from '@styles';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

/**
 * 홈: 배달 주소 · 검색 · 카테고리 · 가게 목록. 장바구니가 있으면 하단에 바로가기 바
 *
 * 목록은 SectionList 하나(섹션 1개)로 그린다. 스크롤을 내리면 인사말·검색창(ListHeaderComponent)은 올라가 사라지고,
 * 카테고리 줄(renderSectionHeader)만 주소줄 아래에 걸려(sticky) 스크롤 중에도 카테고리를 바꿀 수 있다.
 */
const HomeScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { me, favoriteIds, setFavoriteIds } = useSession();
  const { cart, count, itemsAmount } = useCart();
  const [stores, setStores] = useState<Store[] | null>(null);
  const [address, setAddress] = useState<Address | null>(null);
  const [category, setCategory] = useState('ALL');
  const [query, setQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [s, a] = await Promise.all([getStores(favoriteIds), getAddresses()]);
    setStores(isOk(s) && s.stores ? s.stores : []);
    const list = isOk(a) && a.addresses ? a.addresses : [];
    setAddress(list.find((x) => x.isDefault) ?? list[0] ?? null);
  }, [favoriteIds]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const filtered = useMemo(() => {
    if (!stores) return [];
    const q = query.trim();
    return stores.filter((s) => (category === 'ALL' || s.categoryCd === category) && (!q || s.name.includes(q) || s.intro.includes(q)));
  }, [stores, category, query]);

  const toggleFavorite = async (store: Store) => {
    if (!me) return;
    const on = !store.isFavorite;
    setStores((prev) => (prev ?? []).map((s) => (s.id === store.id ? { ...s, isFavorite: on } : s)));
    setFavoriteIds(on ? [...favoriteIds, store.id] : favoriteIds.filter((id) => id !== store.id));
    const res = await setFavorite(store.id, on, me.id);
    if (!isOk(res)) Toast.show({ type: 'error', text1: res.resultMsg });
    else if (on) Toast.show({ type: 'success', text1: `${store.name}을(를) 찜했어요` });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const sections = useMemo(() => [{ data: filtered }], [filtered]);

  /** 목록 바로 위에 붙는 제목 줄("마포구 전체 · 6곳"). 고정되지 않고 목록과 함께 스크롤된다 */
  const listHead = (
    <View style={styles.listHead}>
      <Typography mode="subtitle1" color="gray900">
        {category === 'ALL' ? '마포구 전체' : CATEGORIES.find((c) => c.code === category)?.label}
      </Typography>
      <Typography mode="caption1" color="gray500">
        {stores ? `${filtered.length}곳` : ''}
      </Typography>
    </View>
  );

  return (
    <ScreenWrapper hasHeader={false} backgroundColor="white" inTab>
      {/* 주소 */}
      <Pressable style={styles.addressBar} onPress={() => navigation.navigate('AddressList')}>
        <MaterialCommunityIcons name="map-marker" size={20} color={theme.colors.primary} />
        <Typography mode="subtitle2" color="gray900" numberOfLines={1} style={{ flexShrink: 1 }}>
          {address ? `${address.roadAddress} ${address.detail}`.trim() : '배달 받을 주소를 등록해 주세요'}
        </Typography>
        <MaterialCommunityIcons name="chevron-down" size={20} color={theme.colors.gray500} />
      </Pressable>

      <SectionList
        sections={sections}
        keyExtractor={(s) => s.id}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
        // 스크롤하면 사라지는 부분: 인사말 + 검색창
        ListHeaderComponent={
          <View style={styles.hero}>
            <Typography mode="heading2" color="white">
              오늘 뭐 먹지?{'\n'}
              <Typography mode="heading2" color="orange100">
                {me?.name ? `${me.name}님, ` : ''}간편하게 주문해요
              </Typography>
            </Typography>
            <View style={[styles.search, searchFocused && styles.searchFocused]}>
              <MaterialCommunityIcons name="magnify" size={20} color={theme.colors.gray500} />
              <TextInput
                style={styles.searchInput}
                placeholder="가게 이름이나 메뉴로 검색"
                placeholderTextColor={theme.colors.gray400}
                value={query}
                onChangeText={setQuery}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                returnKeyType="search"
              />
              {!!query && (
                <Pressable onPress={() => setQuery('')} hitSlop={8}>
                  <MaterialCommunityIcons name="close-circle" size={18} color={theme.colors.gray400} />
                </Pressable>
              )}
            </View>
          </View>
        }
        // 상단에 걸리는 부분: 카테고리 줄. 뒤로 지나가는 카드가 비치지 않게 흰 배경을 깐다
        renderSectionHeader={() => (
          <View style={styles.catsSticky}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cats}>
              {CATEGORIES.map((c) => {
                const on = category === c.code;
                return (
                  <Pressable key={c.code} onPress={() => setCategory(c.code)} style={styles.cat}>
                    <View style={[styles.catIcon, on && styles.catIconOn]}>
                      <MaterialCommunityIcons name={c.icon as IconName} size={22} color={on ? theme.colors.white : theme.colors.orange600} />
                    </View>
                    <Typography mode="caption1" color={on ? 'orange700' : 'gray600'}>
                      {c.label}
                    </Typography>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}
        // 첫 카드 위에만 제목 줄을 붙인다 (제목 줄은 고정하지 않고 같이 스크롤)
        renderItem={({ item, index }) => (
          <View style={{ paddingHorizontal: 20 }}>
            {index === 0 && listHead}
            <StoreCard store={item} onPress={() => navigation.navigate('StoreDetail', { storeId: item.id })} onToggleFavorite={() => toggleFavorite(item)} />
          </View>
        )}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        // 카드가 하나도 없을 때: 불러오는 중이면 스켈레톤, 다 불러왔으면 제목 줄 + 빈 안내
        renderSectionFooter={() =>
          stores === null ? (
            <SkeletonList rows={4} />
          ) : filtered.length === 0 ? (
            <View style={{ paddingHorizontal: 20 }}>
              {listHead}
              <View style={styles.empty}>
                <MaterialCommunityIcons name="store-search-outline" size={40} color={theme.colors.gray300} />
                <Typography mode="body1" color="gray500">
                  조건에 맞는 가게가 없어요
                </Typography>
              </View>
            </View>
          ) : null
        }
        ListFooterComponent={<View style={{ height: cart ? 80 : 16 }} />}
      />

      {cart && (
        <Pressable style={styles.cartBar} onPress={() => navigation.navigate('Cart')}>
          <View style={styles.cartCount}>
            <Typography mode="subtitle4" color="orange700">
              {count}
            </Typography>
          </View>
          <Typography mode="subtitle2" color="white" style={{ flex: 1 }} numberOfLines={1}>
            {cart.storeName} · {itemsAmount.toLocaleString('ko-KR')}원
          </Typography>
          <Typography mode="subtitle2" color="white">
            장바구니 보기
          </Typography>
        </Pressable>
      )}
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  addressBar: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 12 },
  list: { paddingBottom: 16 },
  hero: { marginHorizontal: 20, marginBottom: 8, padding: 20, borderRadius: theme.radius.xl, backgroundColor: theme.colors.primary, gap: 16 },
  // 테두리는 평소 투명으로 두고 포커스 때 색만 바꾼다 (두께가 생겼다 없어지면 크기가 들썩인다)
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    borderColor: 'transparent',
    paddingHorizontal: 14,
    height: 48,
  },
  // 주황 배경 위라 메인색 테두리는 안 보이므로 진한 주황(primaryDark)으로 포커스를 표시한다
  searchFocused: { borderColor: theme.colors.primaryDark },
  searchInput: {
    flex: 1,
    ...typographyStyles.body2,
    color: theme.colors.gray900,
    paddingVertical: 0,
    // 브라우저 기본 포커스 outline 을 끈다. 포커스 표시는 바깥 테두리 색이 담당한다
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : {}),
  },
  // 고정 상태에서 목록이 뒤로 지나가므로 흰 배경 + 아래 구분선으로 경계를 준다
  catsSticky: { backgroundColor: theme.colors.white, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.gray100 },
  cats: { paddingHorizontal: 20, gap: 14 },
  cat: { alignItems: 'center', gap: 6, width: 56 },
  catIcon: { width: 52, height: 52, borderRadius: 18, backgroundColor: theme.colors.orange50, alignItems: 'center', justifyContent: 'center' },
  catIconOn: { backgroundColor: theme.colors.primary },
  listHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 12, paddingBottom: 8 },
  sep: { height: 1, backgroundColor: theme.colors.gray100, marginHorizontal: 20 },
  empty: { alignItems: 'center', gap: 12, paddingVertical: 60 },
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

export default HomeScreen;

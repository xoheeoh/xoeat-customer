import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';
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

/** 홈: 배달 주소 · 검색 · 카테고리 · 가게 목록. 장바구니가 있으면 하단에 바로가기 바 */
const HomeScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { me, favoriteIds, setFavoriteIds } = useSession();
  const { cart, count, itemsAmount } = useCart();
  const [stores, setStores] = useState<Store[] | null>(null);
  const [address, setAddress] = useState<Address | null>(null);
  const [category, setCategory] = useState('ALL');
  const [query, setQuery] = useState('');
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

      <FlatList
        data={filtered}
        keyExtractor={(s) => s.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
        ListHeaderComponent={
          <View style={{ gap: 16 }}>
            <View style={styles.hero}>
              <Typography mode="heading2" color="white">
                오늘 뭐 먹지?{'\n'}
                <Typography mode="heading2" color="orange100">
                  {me?.name ? `${me.name}님, ` : ''}간편하게 주문해요
                </Typography>
              </Typography>
              <View style={styles.search}>
                <MaterialCommunityIcons name="magnify" size={20} color={theme.colors.gray500} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="가게 이름이나 메뉴로 검색"
                  placeholderTextColor={theme.colors.gray400}
                  value={query}
                  onChangeText={setQuery}
                  returnKeyType="search"
                />
                {!!query && (
                  <Pressable onPress={() => setQuery('')} hitSlop={8}>
                    <MaterialCommunityIcons name="close-circle" size={18} color={theme.colors.gray400} />
                  </Pressable>
                )}
              </View>
            </View>

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

            <View style={styles.listHead}>
              <Typography mode="subtitle1" color="gray900">
                {category === 'ALL' ? '마포구 전체' : CATEGORIES.find((c) => c.code === category)?.label}
              </Typography>
              <Typography mode="caption1" color="gray500">
                {stores ? `${filtered.length}곳` : ''}
              </Typography>
            </View>
            {stores === null && <SkeletonList rows={4} />}
          </View>
        }
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: 20 }}>
            <StoreCard store={item} onPress={() => navigation.navigate('StoreDetail', { storeId: item.id })} onToggleFavorite={() => toggleFavorite(item)} />
          </View>
        )}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        ListEmptyComponent={
          stores ? (
            <View style={styles.empty}>
              <MaterialCommunityIcons name="store-search-outline" size={40} color={theme.colors.gray300} />
              <Typography mode="body1" color="gray500">
                조건에 맞는 가게가 없어요
              </Typography>
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
  hero: { marginHorizontal: 20, padding: 20, borderRadius: theme.radius.xl, backgroundColor: theme.colors.primary, gap: 16 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.colors.white, borderRadius: theme.radius.md, paddingHorizontal: 14, height: 48 },
  searchInput: { flex: 1, ...typographyStyles.body2, color: theme.colors.gray900, paddingVertical: 0 },
  cats: { paddingHorizontal: 20, gap: 14 },
  cat: { alignItems: 'center', gap: 6, width: 56 },
  catIcon: { width: 52, height: 52, borderRadius: 18, backgroundColor: theme.colors.orange50, alignItems: 'center', justifyContent: 'center' },
  catIconOn: { backgroundColor: theme.colors.primary },
  listHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: 20, paddingTop: 4 },
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

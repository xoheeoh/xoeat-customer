import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { Animated, Easing, Image, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

import type { RootStackParamList } from '@typ/navigation';
import type { Menu, Store } from '@typ/domain';
import { getStore, getStoreMenus } from '@apis/catalogApi';
import { setFavorite } from '@apis/customerApi';
import { isOk } from '@apis/client';
import { useSession } from '@contexts/SessionContext';
import { useCart } from '@contexts/CartContext';
import { CATEGORIES } from '@dt/constants';
import { won } from '@utils/formatter';
import { CartBar, MenuRow } from '@components/store';
import { NavIconButton, ScreenWrapper, SkeletonList, Typography, typographyStyles } from '@components/common';
import { rowBetween, screen, theme } from '@styles';

type Props = NativeStackScreenProps<RootStackParamList, 'StoreDetail'>;
type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

/** 화면 맨 위에 떠 있는 바(뒤로·검색·찜)의 높이. 공통 Header 와 같다 */
const HEADER_HEIGHT = screen.headerHeight;
/** 대표 이미지 높이. 메뉴 상세와 같은 공용 값 */
const HERO_HEIGHT = screen.heroImage;
/** ScrollView 자식 중 상단에 고정할 카테고리 칩 줄의 순번 (0 대표이미지, 1 가게정보, 2 칩 줄) */
const STICKY_INDEX = 2;

/**
 * 가게 상세: 대표 이미지 · 가게 정보 요약 · 메뉴 카테고리 칩 · 카테고리별 메뉴. 하단에 장바구니 바
 *
 * 스크롤 동작
 * - 대표 이미지와 가게 정보는 스크롤을 따라 올라가 사라진다.
 * - 이미지가 상단 바 뒤로 들어가면 상단 바가 흰색으로 바뀌고, 뒤로·찜 버튼 사이에 "가게 내 메뉴 검색" 입력창이 나타난다.
 * - 메뉴 카테고리 칩 줄은 처음부터 보이며, 스크롤하면 상단 바 바로 아래에 고정(sticky)된다.
 *   고정 위치를 상단 바 아래로 맞추기 위해 칩 줄 바깥에 상단 바 높이만큼 투명한 위 여백을 두고, 바로 위 가게 정보 블록을 같은 크기의 음수 margin 으로 끌어올려 겹친다.
 *   (고정됐을 때 그 투명 여백은 흰 상단 바에 가려지고, 펼친 상태에선 가게 정보 블록의 끝부분과 겹치지만 터치는 통과시킨다)
 * - 칩을 누르면 해당 카테고리 제목이 칩 줄 바로 아래 오도록 스크롤한다.
 * - 가게 정보(영업시간·주소·원산지)는 가게 이름 옆 "가게 정보 >" 로 별도 화면(StoreInfo)에서 본다.
 */
const StoreDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { storeId } = route.params;
  const { me, favoriteIds, setFavoriteIds } = useSession();
  const { cart, count, itemsAmount } = useCart();
  const [store, setStore] = useState<Store | null>(null);
  const [menus, setMenus] = useState<Menu[] | null>(null);
  const [query, setQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  // 스크롤 상태: 이미지가 상단 바 뒤로 들어갔는지(상단 바를 흰색 + 검색창으로), 지금 보는 메뉴 카테고리
  const scrollRef = useRef<ScrollView>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  /** 메뉴 카테고리 섹션 View 들. 위치를 잴 때 쓴다 */
  const sectionRefs = useRef<Record<string, React.ElementRef<typeof View> | null>>({});
  /** 메뉴 카테고리 제목들의 세로 위치(스크롤 내용 기준). 칩 강조 계산에 쓴다 */
  const sectionTops = useRef<Record<string, number>>({});
  /** 칩 줄(흰 배경 부분)의 높이. 고정됐을 때 제목이 그 아래 오도록 스크롤 위치를 보정한다 */
  const chipsRowHeight = useRef(0);
  /**
   * 칩을 눌러 이동하는 동안에는 "누른 칩이 이긴다": 스크롤 위치로 활성 칩을 바꾸지 않는다.
   * 섹션이 짧아 제목을 맨 위까지 못 올리는 경우에도 누른 칩이 그대로 켜져 있게 하기 위해서다.
   * 이동 애니메이션의 스크롤 이벤트가 멈추고 잠시 지나면 풀고, 사용자가 직접 스크롤을 시작하면 바로 푼다.
   */
  const pinned = useRef(false);
  const pinReleaseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const releasePinAfter = (ms: number) => {
    if (pinReleaseTimer.current) clearTimeout(pinReleaseTimer.current);
    pinReleaseTimer.current = setTimeout(() => (pinned.current = false), ms);
  };

  useFocusEffect(
    useCallback(() => {
      getStore(storeId, favoriteIds).then((res) => isOk(res) && res.store && setStore(res.store));
      getStoreMenus(storeId).then((res) => setMenus(isOk(res) && res.menus ? res.menus : []));
    }, [storeId, favoriteIds]),
  );

  /** 검색어로 거른 뒤 카테고리별로 묶는다 */
  const sections = useMemo(() => {
    if (!menus) return [];
    const q = query.trim();
    const map = new Map<string, Menu[]>();
    menus
      .filter((m) => !q || m.name.includes(q) || m.description.includes(q))
      .forEach((m) => {
        const list = map.get(m.categoryName) ?? [];
        list.push(m);
        map.set(m.categoryName, list);
      });
    return [...map.entries()];
  }, [menus, query]);

  const toggleFavorite = async () => {
    if (!me || !store) return;
    const on = !store.isFavorite;
    setStore({ ...store, isFavorite: on });
    setFavoriteIds(on ? [...favoriteIds, store.id] : favoriteIds.filter((id) => id !== store.id));
    const res = await setFavorite(store.id, on, me.id);
    if (!isOk(res)) Toast.show({ type: 'error', text1: res.resultMsg });
  };

  /** 고정 영역(상단 바 + 칩 줄)의 전체 높이. 카테고리 제목은 이 아래부터 보여야 한다 */
  const stickyCoverHeight = () => HEADER_HEIGHT + chipsRowHeight.current;

  /**
   * 섹션 하나의 세로 위치를 스크롤 내용 기준으로 잰다.
   * onLayout 은 (특히 웹에서) 요소 자체 크기가 바뀔 때만 다시 불려서, 위쪽 가게 정보가 나중에 로드돼 길어져도 아래 섹션 위치가 갱신되지 않는다.
   * 그래서 필요한 순간에 직접 잰다.
   */
  const measureSection = (name: string, onDone: (top: number) => void) => {
    const view = sectionRefs.current[name];
    const content = scrollRef.current?.getInnerViewNode?.();
    if (!view || !content) return;
    view.measureLayout(content, (_x, y) => {
      sectionTops.current[name] = y;
      onDone(y);
    });
  };

  /** 내용 높이가 바뀔 때마다(가게 정보 로드, 검색으로 메뉴 수 변동 등) 모든 섹션 위치를 다시 잰다 */
  const measureAllSections = () => sections.forEach(([name]) => measureSection(name, () => {}));

  // 스크롤 위치를 애니메이션 값으로 받아, 상단 바 흰 배경의 불투명도를 거기에 연속적으로 연결한다 (툭 바뀌지 않고 서서히)
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerBgOpacity = scrollY.interpolate({
    // 이미지 아랫변이 상단 바에 닿기 48px 전부터 서서히 하얘져서, 닿는 순간 완전히 흰색
    inputRange: [HERO_HEIGHT - HEADER_HEIGHT - 48, HERO_HEIGHT - HEADER_HEIGHT],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const y = contentOffset.y;
    setCollapsed(y > HERO_HEIGHT - HEADER_HEIGHT);

    // 칩을 눌러 이동 중이면 위치 기반 갱신은 건너뛴다 (누른 칩 유지). 이벤트가 0.2초간 더 안 오면 이동이 끝난 것으로 보고 푼다
    if (pinned.current) {
      releasePinAfter(200);
      return;
    }

    // 바닥에 닿았으면 마지막 카테고리. 마지막 섹션이 짧아 제목이 맨 위까지 못 올라와도 켜지게 한다
    const atBottom = y + layoutMeasurement.height >= contentSize.height - 2;
    if (atBottom && sections.length > 0) {
      setActiveSection(sections[sections.length - 1][0]);
      return;
    }

    // 고정 영역 아래 경계를 지난 제목 중 가장 마지막 것이 "지금 보는 카테고리"
    let current = sections[0]?.[0] ?? null;
    for (const [name] of sections) {
      const top = sectionTops.current[name];
      if (top !== undefined && top - stickyCoverHeight() <= y + 2) current = name;
    }
    setActiveSection(current);
  };

  /** 사용자가 손으로 스크롤을 시작하면 "누른 칩 유지"를 바로 푼다 */
  const onScrollBeginDrag = () => {
    pinned.current = false;
    if (pinReleaseTimer.current) clearTimeout(pinReleaseTimer.current);
  };

  const scrollToSection = (name: string) => {
    // 누른 칩을 즉시 켜고, 이동이 끝날 때까지 위치 기반 갱신을 막는다.
    // 이미 그 위치라 스크롤 이벤트가 전혀 안 올 수도 있으므로 1초 뒤에는 어쨌든 푼다
    setActiveSection(name);
    pinned.current = true;
    releasePinAfter(1000);
    measureSection(name, (top) =>
      scrollRef.current?.scrollTo({ y: Math.max(0, top - stickyCoverHeight()), animated: true }),
    );
  };

  // 스크롤 이벤트 하나로 scrollY 갱신 + 위 onScroll 로직 둘 다 처리한다
  const handleScroll = Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
    useNativeDriver: false,
    listener: onScroll,
  });

  const icon = (CATEGORIES.find((c) => c.code === store?.categoryCd)?.icon ?? 'silverware-fork-knife') as IconName;
  const cartIsHere = cart?.storeId === storeId;
  const highlighted = activeSection ?? sections[0]?.[0];
  const searching = query.trim().length > 0;
  /** 검색어에 걸린 메뉴 수 (칩 줄의 안내 문구용) */
  const resultCount = sections.reduce((sum, [, list]) => sum + list.length, 0);

  // 상단 바의 검색창은 접힌 상태에서 보인다. 검색어를 치는 중이거나 입력 중(포커스)일 땐 결과가 줄어 스크롤이 위로 당겨져도 유지한다 (사라지면 포커스를 잃는다)
  const showHeaderSearch = collapsed || searchFocused || query.trim().length > 0;

  // 검색창 등장/퇴장 애니메이션. 0 = 숨김, 1 = 표시. 사라지는 애니메이션이 끝날 때까지 그려 둬야 하므로 "그려 둘지"를 별도 상태로 관리한다
  const searchAnim = useRef(new Animated.Value(0)).current;
  const [searchMounted, setSearchMounted] = useState(false);
  useEffect(() => {
    if (showHeaderSearch) {
      setSearchMounted(true);
      Animated.timing(searchAnim, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(searchAnim, {
        toValue: 0,
        duration: 150,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setSearchMounted(false);
      });
    }
  }, [showHeaderSearch, searchAnim]);
  const searchMotion = {
    opacity: searchAnim,
    transform: [{ translateY: searchAnim.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) }],
  };

  return (
    <ScreenWrapper hasHeader={false} backgroundColor="white">
      <View style={{ flex: 1 }}>
        <Animated.ScrollView
          ref={scrollRef}
          onScroll={handleScroll}
          onScrollBeginDrag={onScrollBeginDrag}
          scrollEventThrottle={16}
          onContentSizeChange={measureAllSections}
          stickyHeaderIndices={[STICKY_INDEX]}
          contentContainerStyle={{ paddingBottom: cart ? 96 : 24 }}>
          {/* 0. 대표 이미지 (상단 바 뒤까지 올라가 있다) */}
          {store?.imageUrl ? (
            <Image source={{ uri: store.imageUrl }} style={styles.heroImage} />
          ) : (
            <View style={[styles.heroImage, styles.heroEmpty]}>
              <MaterialCommunityIcons name={icon} size={56} color={theme.colors.orange300} />
            </View>
          )}

          {/* 1. 가게 정보 요약: 이름 + "가게 정보 >" · 소개 · 배달/포장/최소주문 */}
          <View style={styles.info}>
            <View style={styles.nameRow}>
              <View style={styles.nameWithPill}>
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
                <Pressable
                  onPress={() => navigation.navigate('StoreInfo', { storeId })}
                  hitSlop={8}
                  accessibilityRole="button"
                  style={styles.infoLink}>
                  <Typography mode="caption1" color="gray600">
                    가게 정보
                  </Typography>
                  <MaterialCommunityIcons name="chevron-right" size={18} color={theme.colors.gray500} />
                </Pressable>
              )}
            </View>
            {store && (
              <>
                <Typography mode="body2" color="gray600">
                  {store.intro}
                </Typography>
                <View style={styles.metaGrid}>
                  <Meta
                    icon="moped-outline"
                    label="배달"
                    value={
                      store.deliveryEnabled
                        ? `${store.deliveryMinutesMin}~${store.deliveryMinutesMax}분 · ${store.deliveryFee ? won(store.deliveryFee) : '무료'}`
                        : '미운영'
                    }
                  />
                  <Meta icon="shopping-outline" label="포장" value={store.pickupEnabled ? '가능' : '미운영'} />
                  <Meta icon="cash" label="최소주문" value={won(store.minOrderAmount)} />
                </View>
              </>
            )}
          </View>

          {/* 2. 메뉴 카테고리 칩 줄 (상단 고정). 바깥은 상단 바 높이만큼 투명 여백, 안쪽이 실제 칩 줄 */}
          <View pointerEvents="box-none" style={styles.chipsSticky}>
            <View
              onLayout={(e: LayoutChangeEvent) => (chipsRowHeight.current = e.nativeEvent.layout.height)}
              style={styles.chipsRow}>
              {searching ? (
                // 검색 중에는 칩 대신 결과 안내. 칩과 같은 높이를 유지해 줄이 들썩이지 않게 한다
                <View style={styles.searchSummary}>
                  <Typography mode="caption1" color="gray600">
                    ‘{query.trim()}’ 검색 결과 {resultCount}개
                  </Typography>
                </View>
              ) : sections.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                  {sections.map(([name]) => {
                    const on = highlighted === name;
                    return (
                      <Pressable
                        key={name}
                        onPress={() => scrollToSection(name)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: on }}
                        style={[styles.chip, on && styles.chipOn]}>
                        <Typography mode="caption1" color={on ? 'white' : 'gray700'}>
                          {name}
                        </Typography>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              ) : (
                // 메뉴를 불러오기 전에도 줄 높이는 유지해 화면이 들썩이지 않게 한다 (보이지 않는 자리표시)
                <View style={styles.chipPlaceholder} />
              )}
            </View>
          </View>

          {/* 3~. 카테고리별 메뉴 */}
          {menus === null ? (
            <View style={{ padding: 20 }}>
              <SkeletonList rows={5} />
            </View>
          ) : sections.length === 0 ? (
            <View style={styles.empty}>
              <MaterialCommunityIcons name="food-off-outline" size={40} color={theme.colors.gray300} />
              <Typography mode="body1" color="gray500">
                {query.trim() ? '검색 결과가 없어요' : '등록된 메뉴가 없어요'}
              </Typography>
            </View>
          ) : (
            sections.map(([name, list]) => (
              // 섹션 View 를 기억해 두고, 칩을 누르면 위치를 재서 여기로 스크롤한다
              <View
                key={name}
                ref={(v) => {
                  sectionRefs.current[name] = v;
                }}>
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
          )}
        </Animated.ScrollView>

        {/* 상단 바: 평소엔 이미지 위에 투명하게 떠 있고, 이미지가 지나가면 흰 배경 + 가게 내 메뉴 검색창. 흰 배경은 스크롤에 따라 서서히 진해진다 */}
        <View style={styles.header}>
          <Animated.View pointerEvents="none" style={[styles.headerBg, { opacity: headerBgOpacity }]} />
          <NavIconButton icon="chevron-left" accessibilityLabel="뒤로" onPress={() => navigation.goBack()} />
          <View style={styles.headerMiddle}>
            {searchMounted && (
              <Animated.View style={[styles.search, searchFocused && styles.searchFocused, searchMotion]}>
                <MaterialCommunityIcons name="magnify" size={18} color={theme.colors.gray500} />
                <TextInput
                  style={styles.searchInput}
                  placeholder={`${store?.name ?? '가게'} 내 메뉴 검색`}
                  placeholderTextColor={theme.colors.gray400}
                  value={query}
                  onChangeText={setQuery}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  returnKeyType="search"
                />
                {!!query && (
                  <Pressable onPress={() => setQuery('')} hitSlop={8} accessibilityRole="button" accessibilityLabel="검색어 지우기">
                    <MaterialCommunityIcons name="close-circle" size={16} color={theme.colors.gray400} />
                  </Pressable>
                )}
              </Animated.View>
            )}
          </View>
          <NavIconButton
            icon={store?.isFavorite ? 'heart' : 'heart-outline'}
            // 찜한 상태는 홈 카드의 하트와 같은 메인색
            iconColor={store?.isFavorite ? theme.colors.primary : undefined}
            accessibilityLabel="찜"
            onPress={toggleFavorite}
          />
        </View>

        {cart && <CartBar count={count} text={cartIsHere ? `${itemsAmount.toLocaleString('ko-KR')}원` : `${cart.storeName} 장바구니`} onPress={() => navigation.navigate('Cart')} />}
      </View>
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

const styles = StyleSheet.create({
  heroImage: { width: '100%', height: HERO_HEIGHT, backgroundColor: theme.colors.gray100 },
  heroEmpty: { alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.orange50 },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: HEADER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
  },
  // 상단 바 뒤에 깔리는 흰 배경 층. 불투명도만 스크롤에 따라 바뀐다
  headerBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.line,
  },
  headerMiddle: { flex: 1, justifyContent: 'center' },
  // 상단 바 안의 검색창. 양옆 둥근 버튼(40)과 같은 높이
  // 테두리는 평소 투명으로 두고 포커스 때 색만 바꾼다 (두께가 생겼다 없어지면 크기가 들썩인다)
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.gray50,
    borderRadius: theme.radius.pill,
    borderWidth: 1.5,
    borderColor: 'transparent',
    paddingHorizontal: 12,
    height: 40,
  },
  // 포커스 표시는 입력칸과 같은 규칙: 메인색 테두리 + 흰 배경
  searchFocused: { borderColor: theme.colors.primary, backgroundColor: theme.colors.white },
  searchInput: {
    flex: 1,
    ...typographyStyles.body2,
    color: theme.colors.gray900,
    paddingVertical: 0,
    // 브라우저 기본 포커스 outline 을 끈다. 포커스 표시는 바깥 테두리 색이 담당한다
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : {}),
  },
  // 아래 음수 margin: 다음에 오는 고정 칩 줄의 투명 위 여백(상단 바 높이)만큼 끌어올려 겹치게 한다. 고정 칩 줄 쪽 주석 참고
  info: {
    padding: 20,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.line,
    marginBottom: -HEADER_HEIGHT,
  },
  nameRow: { ...rowBetween, gap: 12 },
  nameWithPill: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  infoLink: { flexDirection: 'row', alignItems: 'center', flexShrink: 0 },
  closedPill: {
    backgroundColor: theme.colors.gray100,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 8,
    height: 22,
    justifyContent: 'center',
  },
  metaGrid: { flexDirection: 'row', gap: 8, marginTop: 4 },
  meta: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    backgroundColor: theme.colors.gray50,
    borderRadius: theme.radius.md,
    paddingVertical: 10,
  },
  // 고정 칩 줄의 바깥: 상단 바 높이만큼 투명한 위 여백 → 고정됐을 때 칩 줄이 상단 바 바로 아래에 온다.
  // 상쇄용 음수 margin 은 여기가 아니라 바로 위 info 블록의 marginBottom 에 둔다. 고정되는 요소 안에 두면 라이브러리의 고정 래퍼 안에서 여백과 서로 상쇄돼 효과가 사라진다
  chipsSticky: { paddingTop: HEADER_HEIGHT },
  // 고정 칩 줄의 안쪽: 뒤로 지나가는 메뉴가 비치지 않게 흰 배경 + 아래 구분선
  chipsRow: {
    paddingVertical: 10,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray100,
  },
  chips: { paddingHorizontal: 20, gap: 8 },
  chip: {
    height: 32,
    paddingHorizontal: 14,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.gray100,
    justifyContent: 'center',
  },
  chipOn: { backgroundColor: theme.colors.gray900 },
  chipPlaceholder: { height: 32 },
  searchSummary: { height: 32, justifyContent: 'center', paddingHorizontal: 20 },
  sectionTitle: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 },
  sectionGap: { height: 8, backgroundColor: theme.colors.gray50, marginTop: 4 },
  sep: { height: 1, backgroundColor: theme.colors.gray100, marginHorizontal: 20 },
  empty: { alignItems: 'center', gap: 12, paddingVertical: 60 },
});

export default StoreDetailScreen;

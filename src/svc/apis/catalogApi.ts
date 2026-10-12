/**
 * 가게 · 메뉴 조회 어댑터 (읽기 전용)
 */
import { run, supabase, unwrap } from './client';
import type { Menu, OptionGroup, SaleStatus, Store, StoreHour } from '@typ/domain';

type HourRow = { day_of_week: number; enabled: boolean; open_time: string; close_time: string; break_from: string | null; break_to: string | null };
type StoreRow = {
  id: string;
  name: string;
  category_cd: string;
  intro: string;
  origin_info: string;
  phone: string;
  address: string;
  image_url: string | null;
  min_order_amount: number;
  delivery_fee: number;
  delivery_enabled: boolean;
  pickup_enabled: boolean;
  status: 'OPEN' | 'PAUSED';
  delivery_minutes_min: number;
  delivery_minutes_max: number;
  store_hours: HourRow[];
  /** 가게 목록 조회에서만 함께 가져온다 (메뉴명 검색용) */
  menus?: { name: string }[];
};

const STORE_SELECT = 'id, name, category_cd, intro, origin_info, phone, address, image_url, min_order_amount, delivery_fee, delivery_enabled, pickup_enabled, status, delivery_minutes_min, delivery_minutes_max, store_hours(*)';

const hhmm = (t: string | null) => (t ? t.slice(0, 5) : null);
const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

/** 영업시간 기준 "지금 영업중" (자정 넘김·휴게시간 반영). 요일은 0=월 … 6=일 */
const isOpenAt = (hours: StoreHour[], now = new Date()): boolean => {
  const dow = (now.getDay() + 6) % 7;
  const cur = now.getHours() * 60 + now.getMinutes();
  const within = (h: StoreHour, t: number) => {
    const o = toMin(h.openTime);
    const c = toMin(h.closeTime);
    const inRange = c > o ? t >= o && t < c : t >= o || t < c; // 자정 넘김
    if (!inRange) return false;
    if (h.breakFrom && h.breakTo) {
      const bf = toMin(h.breakFrom);
      const bt = toMin(h.breakTo);
      if (t >= bf && t < bt) return false;
    }
    return true;
  };
  const today = hours.find((h) => h.dayOfWeek === dow);
  if (today?.enabled && within(today, cur)) return true;
  // 어제 영업시간이 자정을 넘겨 지금까지 이어지는 경우
  const yday = hours.find((h) => h.dayOfWeek === (dow + 6) % 7);
  if (yday?.enabled && toMin(yday.closeTime) <= toMin(yday.openTime) && cur < toMin(yday.closeTime)) return true;
  return false;
};

const toStore = (r: StoreRow, favoriteIds: Set<string>): Store => {
  const hours: StoreHour[] = [...(r.store_hours ?? [])]
    .sort((a, b) => a.day_of_week - b.day_of_week)
    .map((h) => ({ dayOfWeek: h.day_of_week, enabled: h.enabled, openTime: hhmm(h.open_time)!, closeTime: hhmm(h.close_time)!, breakFrom: hhmm(h.break_from), breakTo: hhmm(h.break_to) }));
  return {
    id: r.id,
    name: r.name,
    categoryCd: r.category_cd,
    intro: r.intro,
    originInfo: r.origin_info,
    phone: r.phone,
    address: r.address,
    imageUrl: r.image_url,
    minOrderAmount: r.min_order_amount,
    deliveryFee: r.delivery_fee,
    deliveryEnabled: r.delivery_enabled,
    pickupEnabled: r.pickup_enabled,
    status: r.status,
    deliveryMinutesMin: r.delivery_minutes_min,
    deliveryMinutesMax: r.delivery_minutes_max,
    hours,
    isOpenNow: r.status === 'OPEN' && (hours.length === 0 || isOpenAt(hours)),
    isFavorite: favoriteIds.has(r.id),
    menuNames: r.menus?.map((m) => m.name),
  };
};

/** 가게 목록. 영업중 먼저, 이름순. 홈 검색용으로 메뉴 이름도 함께 가져온다 (숨김 메뉴는 RLS 로 제외) */
export const getStores = (favoriteIds: string[] = []) =>
  run(async () => {
    const rows = unwrap(await supabase.from('stores').select(`${STORE_SELECT}, menus(name)`).order('name')) as unknown as StoreRow[];
    const fav = new Set(favoriteIds);
    const stores = rows.map((r) => toStore(r, fav)).sort((a, b) => Number(b.isOpenNow) - Number(a.isOpenNow));
    return { stores };
  });

export const getStore = (storeId: string, favoriteIds: string[] = []) =>
  run(async () => {
    const row = unwrap(await supabase.from('stores').select(STORE_SELECT).eq('id', storeId).single()) as unknown as StoreRow;
    return { store: toStore(row, new Set(favoriteIds)) };
  });

/* ── 메뉴 ──────────────────────────────────────────────────────── */
type OptionRow = { id: string; name: string; price: number; sold_out: boolean; sort_order: number };
type GroupRow = { id: string; name: string; required: boolean; min_select: number; max_select: number; sort_order: number; options: OptionRow[] };
type MenuRow = {
  id: string;
  store_id: string;
  category_id: string | null;
  name: string;
  description: string;
  standard: string;
  price: number;
  image_url: string | null;
  sale_status: SaleStatus;
  adult_only: boolean;
  sort_order: number;
  menu_categories: { name: string; sort_order: number } | null;
  menu_option_groups: { sort_order: number; option_groups: GroupRow }[];
};

const MENU_SELECT =
  'id, store_id, category_id, name, description, standard, price, image_url, sale_status, adult_only, sort_order, menu_categories(name, sort_order), menu_option_groups(sort_order, option_groups(id, name, required, min_select, max_select, sort_order, options(id, name, price, sold_out, sort_order)))';

const toMenu = (r: MenuRow): Menu => ({
  id: r.id,
  storeId: r.store_id,
  categoryId: r.category_id,
  categoryName: r.menu_categories?.name ?? '기타',
  categorySort: r.menu_categories?.sort_order ?? 999,
  name: r.name,
  description: r.description,
  standard: r.standard,
  price: r.price,
  imageUrl: r.image_url,
  saleStatus: r.sale_status,
  adultOnly: r.adult_only,
  sortOrder: r.sort_order,
  optionGroups: [...(r.menu_option_groups ?? [])]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map<OptionGroup>((mg) => ({
      id: mg.option_groups.id,
      name: mg.option_groups.name,
      required: mg.option_groups.required,
      minSelect: mg.option_groups.min_select,
      maxSelect: mg.option_groups.max_select,
      options: [...(mg.option_groups.options ?? [])].sort((a, b) => a.sort_order - b.sort_order).map((o) => ({ id: o.id, name: o.name, price: o.price, soldOut: o.sold_out })),
    })),
});

/** 가게의 메뉴 전체 (카테고리 순 → 메뉴 순). 숨김 메뉴는 RLS 로 이미 제외된다 */
export const getStoreMenus = (storeId: string) =>
  run(async () => {
    const rows = unwrap(await supabase.from('menus').select(MENU_SELECT).eq('store_id', storeId)) as unknown as MenuRow[];
    const menus = rows.map(toMenu).sort((a, b) => a.categorySort - b.categorySort || a.sortOrder - b.sortOrder);
    return { menus };
  });

export const getMenu = (menuId: string) =>
  run(async () => {
    const row = unwrap(await supabase.from('menus').select(MENU_SELECT).eq('id', menuId).single()) as unknown as MenuRow;
    return { menu: toMenu(row) };
  });

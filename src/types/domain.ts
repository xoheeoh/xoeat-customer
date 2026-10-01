/**
 * 구매자 앱이 다루는 도메인 타입. 서버 컬럼(snake_case)은 svc/apis 어댑터가 이 모양으로 바꿔 준다.
 */
export type OrderType = 'DELIVERY' | 'PICKUP';
export type OrderStatus = 'PENDING' | 'ACCEPTED' | 'READY' | 'DELIVERING' | 'COMPLETED' | 'REJECTED' | 'CANCELED';
export type SaleStatus = 'ON_SALE' | 'SOLD_OUT' | 'HIDDEN';

export interface Customer {
  id: string;
  loginId: string;
  name: string;
  phone: string;
}

export interface Address {
  id: string;
  label: string;
  roadAddress: string;
  detail: string;
  isDefault: boolean;
}

export interface PaymentMethod {
  id: string;
  brand: string; // 신한, 국민 …
  last4: string;
  expiry: string; // MM/YY
  alias: string;
  isDefault: boolean;
}

export interface StoreHour {
  dayOfWeek: number; // 0=월 … 6=일
  enabled: boolean;
  openTime: string;
  closeTime: string;
  breakFrom: string | null;
  breakTo: string | null;
}

/** 가게 목록·상세 공통 */
export interface Store {
  id: string;
  name: string;
  categoryCd: string;
  intro: string;
  originInfo: string;
  phone: string;
  address: string;
  imageUrl: string | null;
  minOrderAmount: number;
  deliveryFee: number;
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
  status: 'OPEN' | 'PAUSED';
  deliveryMinutesMin: number;
  deliveryMinutesMax: number;
  region: string;
  hours: StoreHour[];
  /** 영업시간·일시중지를 종합한 "지금 주문 가능" */
  isOpenNow: boolean;
  isFavorite: boolean;
}

export interface Option {
  id: string;
  name: string;
  price: number;
  soldOut: boolean;
}

export interface OptionGroup {
  id: string;
  name: string;
  required: boolean;
  minSelect: number;
  maxSelect: number;
  options: Option[];
}

export interface Menu {
  id: string;
  storeId: string;
  categoryId: string | null;
  categoryName: string;
  categorySort: number;
  name: string;
  description: string;
  standard: string;
  price: number;
  imageUrl: string | null;
  saleStatus: SaleStatus;
  adultOnly: boolean;
  sortOrder: number;
  optionGroups: OptionGroup[];
}

/** 장바구니 한 줄. 같은 메뉴라도 옵션이 다르면 다른 줄 */
export interface CartItem {
  key: string; // menuId + 옵션 id 정렬 조합
  menuId: string;
  menuName: string;
  unitPrice: number; // 메뉴가 + 옵션가 합
  basePrice: number;
  quantity: number;
  options: { id: string; groupName: string; name: string; price: number }[];
  adultOnly: boolean;
}

export interface Cart {
  storeId: string;
  storeName: string;
  items: CartItem[];
}

export interface OrderItem {
  id: string;
  menuId: string | null;
  menuName: string;
  quantity: number;
  unitPrice: number;
  options: { groupName: string; name: string; price: number }[];
  lineAmount: number;
}

export interface Order {
  id: string;
  orderNo: string;
  storeId: string;
  storeName: string;
  orderType: OrderType;
  status: OrderStatus;
  address: string | null;
  addressDetail: string | null;
  requestMemo: string;
  itemsAmount: number;
  deliveryFee: number;
  totalAmount: number;
  cardLabel: string | null;
  cookingMinutes: number | null;
  rejectReason: string | null;
  acceptedAt: string | null;
  readyAt: string | null;
  deliveringAt: string | null;
  completedAt: string | null;
  canceledAt: string | null;
  createdAt: string;
  items: OrderItem[];
}

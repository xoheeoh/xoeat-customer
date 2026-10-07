import type { NavigatorScreenParams } from '@react-navigation/native';

export type MainTabParamList = {
  Home: undefined;
  Favorites: undefined;
  Orders: undefined;
  MyPage: undefined;
};

export type RootStackParamList = {
  Login: undefined;
  SignUp: undefined;
  Main: NavigatorScreenParams<MainTabParamList> | undefined;

  // 탐색·주문
  StoreDetail: { storeId: string };
  StoreInfo: { storeId: string };
  MenuDetail: { storeId: string; menuId: string };
  Cart: undefined;
  /** addressId·methodId: 선택 화면에서 고르고 돌아온 배달 주소·결제수단 (기본값과 별개로 이번 주문에만 쓴다) */
  Checkout: { addressId?: string; methodId?: string } | undefined;
  OrderComplete: { orderId: string };
  OrderDetail: { orderId: string };

  // 마이페이지
  /** selectMode: 주문 화면에서 이번 주문의 배달 주소를 고르는 모드. selectedId: 지금 고른 주소 (라디오 표시용) */
  AddressList: { selectMode?: boolean; selectedId?: string } | undefined;
  AddressEdit: { addressId?: string } | undefined;
  /** selectMode: 주문 화면에서 이번 주문의 결제수단을 고르는 모드. selectedId: 지금 고른 카드 (강조 표시용) */
  PaymentMethodList: { selectMode?: boolean; selectedId?: string } | undefined;
  PaymentMethodAdd: undefined;
  ProfileEdit: undefined;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface RootParamList extends RootStackParamList {}
  }
}

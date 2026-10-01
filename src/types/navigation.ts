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
  MenuDetail: { storeId: string; menuId: string };
  Cart: undefined;
  Checkout: undefined;
  OrderComplete: { orderId: string };
  OrderDetail: { orderId: string };

  // 마이페이지
  AddressList: { selectMode?: boolean } | undefined;
  AddressEdit: { addressId?: string } | undefined;
  PaymentMethodList: { selectMode?: boolean } | undefined;
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

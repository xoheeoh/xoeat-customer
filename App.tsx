import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StatusBar, View } from 'react-native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';

import { loadingController } from '@utils/loadingController';
import { hasSession, supabase } from '@apis/client';
import { DEV_START_SCREEN } from '@env';
import type { RootStackParamList } from '@typ/navigation';

import { DialogProvider } from '@contexts/DialogContext';
import { LoadingProvider, useLoading } from '@contexts/LoadingContext';
import { NavigationProvider } from '@contexts/navigationContext';
import { SessionProvider } from '@contexts/SessionContext';
import { CartProvider } from '@contexts/CartContext';

import { Header, toastConfig } from '@components/common';
import {
  AddressEditScreen,
  AddressListScreen,
  CartScreen,
  CheckoutScreen,
  LoginScreen,
  MainTabs,
  MenuDetailScreen,
  OrderCompleteScreen,
  OrderDetailScreen,
  PaymentMethodAddScreen,
  PaymentMethodListScreen,
  ProfileEditScreen,
  SignUpScreen,
  StoreDetailScreen,
  StoreInfoScreen,
} from '@screens';
import { theme } from '@styles';

const GlobalLoading = () => {
  const { isLoading, setLoading } = useLoading();
  useEffect(() => {
    loadingController.register(setLoading);
  }, [setLoading]);
  if (!isLoading) return null;
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.6)', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
    </View>
  );
};

const Stack = createNativeStackNavigator<RootStackParamList>();

SplashScreen.preventAutoHideAsync().catch(() => {});

function App(): React.JSX.Element {
  const [fontsLoaded] = useFonts(
    Platform.OS === 'web'
      ? {
          'Pretendard-Regular': require('./assets/fonts/web/Pretendard-Regular.woff2'),
          'Pretendard-Medium': require('./assets/fonts/web/Pretendard-Medium.woff2'),
          'Pretendard-SemiBold': require('./assets/fonts/web/Pretendard-SemiBold.woff2'),
          'Pretendard-Bold': require('./assets/fonts/web/Pretendard-Bold.woff2'),
        }
      : {
          'Pretendard-Regular': require('./assets/fonts/Pretendard-Regular.otf'),
          'Pretendard-Medium': require('./assets/fonts/Pretendard-Medium.otf'),
          'Pretendard-SemiBold': require('./assets/fonts/Pretendard-SemiBold.otf'),
          'Pretendard-Bold': require('./assets/fonts/Pretendard-Bold.otf'),
        },
  );

  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    hasSession().then((v) => {
      setIsLoggedIn(v);
      setIsLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => setIsLoggedIn(!!session));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isLoading && fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [isLoading, fontsLoaded]);

  if (isLoading || !fontsLoaded) return <></>;

  const getInitialRoute = (): keyof RootStackParamList => {
    if (DEV_START_SCREEN) return DEV_START_SCREEN as keyof RootStackParamList;
    return isLoggedIn ? 'Main' : 'Login';
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <LoadingProvider>
          <StatusBar barStyle="dark-content" />
          <DialogProvider>
            <GlobalLoading />
            <SessionProvider enabled={isLoggedIn}>
              <CartProvider>
                <NavigationProvider>
                  <Stack.Navigator initialRouteName={getInitialRoute()}>
                    <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false, gestureEnabled: false }} />
                    <Stack.Screen name="SignUp" component={SignUpScreen} options={{ header: () => <Header title="회원가입" bgColor="white" leftButton /> }} />
                    <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false, gestureEnabled: false }} />

                    {/* 탐색·주문 */}
                    <Stack.Screen name="StoreDetail" component={StoreDetailScreen} options={{ headerShown: false }} />
                    <Stack.Screen name="StoreInfo" component={StoreInfoScreen} options={{ header: () => <Header title="가게 정보" bgColor="white" leftButton /> }} />
                    <Stack.Screen name="MenuDetail" component={MenuDetailScreen} options={{ header: () => <Header title="" bgColor="white" leftButton /> }} />
                    <Stack.Screen name="Cart" component={CartScreen} options={{ header: () => <Header title="장바구니" bgColor={theme.colors.bg} leftButton /> }} />
                    <Stack.Screen name="Checkout" component={CheckoutScreen} options={{ header: () => <Header title="주문하기" bgColor={theme.colors.bg} leftButton /> }} />
                    <Stack.Screen name="OrderComplete" component={OrderCompleteScreen} options={{ headerShown: false, gestureEnabled: false }} />
                    <Stack.Screen name="OrderDetail" component={OrderDetailScreen} options={{ header: () => <Header title="주문 상세" bgColor={theme.colors.bg} leftButton /> }} />

                    {/* 마이페이지 */}
                    <Stack.Screen
                      name="AddressList"
                      component={AddressListScreen}
                      options={({ route }) => ({ header: () => <Header title={route.params?.selectMode ? '배달 주소 선택' : '배송지 관리'} bgColor="white" leftButton /> })}
                    />
                    <Stack.Screen
                      name="AddressEdit"
                      component={AddressEditScreen}
                      options={({ route }) => ({ header: () => <Header title={route.params?.addressId ? '배송지 수정' : '배송지 추가'} bgColor="white" leftButton /> })}
                    />
                    <Stack.Screen
                      name="PaymentMethodList"
                      component={PaymentMethodListScreen}
                      options={({ route }) => ({ header: () => <Header title={route.params?.selectMode ? '결제수단 선택' : '결제수단 관리'} bgColor="white" leftButton /> })}
                    />
                    <Stack.Screen name="PaymentMethodAdd" component={PaymentMethodAddScreen} options={{ header: () => <Header title="카드 등록" bgColor="white" leftButton /> }} />
                    <Stack.Screen name="ProfileEdit" component={ProfileEditScreen} options={{ header: () => <Header title="내 정보 수정" bgColor="white" leftButton /> }} />
                  </Stack.Navigator>
                  <Toast position="top" topOffset={70} config={toastConfig} />
                </NavigationProvider>
              </CartProvider>
            </SessionProvider>
          </DialogProvider>
        </LoadingProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;

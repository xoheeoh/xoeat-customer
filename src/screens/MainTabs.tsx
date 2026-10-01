import { Platform, StyleSheet, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { MainTabParamList } from '@typ/navigation';
import { Header, Typography } from '@components/common';
import { theme } from '@styles';
import HomeScreen from './Home/HomeScreen';
import FavoritesScreen from './Home/FavoritesScreen';
import OrdersScreen from './Orders/OrdersScreen';
import MyPageScreen from './MyPage/MyPageScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();
type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const TABS: Record<keyof MainTabParamList, { label: string; icon: IconName; iconActive: IconName }> = {
  Home: { label: '홈', icon: 'home-outline', iconActive: 'home' },
  Favorites: { label: '찜', icon: 'heart-outline', iconActive: 'heart' },
  Orders: { label: '주문내역', icon: 'receipt-text-outline', iconActive: 'receipt-text' },
  MyPage: { label: '마이', icon: 'account-outline', iconActive: 'account' },
};

const TabIcon = ({ name, focused }: { name: keyof MainTabParamList; focused: boolean }) => {
  const t = TABS[name];
  return (
    <View style={styles.tabItem}>
      <MaterialCommunityIcons name={focused ? t.iconActive : t.icon} size={24} color={focused ? theme.colors.primary : theme.colors.gray400} />
      <Typography mode="caption2" color={focused ? 'primary' : 'gray500'}>
        {t.label}
      </Typography>
    </View>
  );
};

const MainTabs = () => {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarShowLabel: false,
        tabBarStyle: {
          height: 56 + (Platform.OS === 'web' ? 0 : insets.bottom),
          paddingTop: 6,
          paddingBottom: Platform.OS === 'web' ? 0 : insets.bottom,
          borderTopColor: theme.colors.line,
          backgroundColor: theme.colors.white,
        },
        tabBarItemStyle: { paddingVertical: 0 },
      }}>
      <Tab.Screen name="Home" component={HomeScreen} options={{ headerShown: false, tabBarIcon: ({ focused }) => <TabIcon name="Home" focused={focused} /> }} />
      <Tab.Screen name="Favorites" component={FavoritesScreen} options={{ header: () => <Header title="찜한 가게" bgColor="white" />, tabBarIcon: ({ focused }) => <TabIcon name="Favorites" focused={focused} /> }} />
      <Tab.Screen name="Orders" component={OrdersScreen} options={{ header: () => <Header title="주문내역" bgColor="white" />, tabBarIcon: ({ focused }) => <TabIcon name="Orders" focused={focused} /> }} />
      <Tab.Screen name="MyPage" component={MyPageScreen} options={{ header: () => <Header title="마이페이지" bgColor={theme.colors.bg} />, tabBarIcon: ({ focused }) => <TabIcon name="MyPage" focused={focused} /> }} />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({ tabItem: { alignItems: 'center', gap: 2, width: 72 } });

export default MainTabs;

import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Application from 'expo-application';

import type { RootStackParamList } from '@typ/navigation';
import { logout } from '@apis/customerApi';
import { useSession } from '@contexts/SessionContext';
import { useCart } from '@contexts/CartContext';
import { useDialog } from '@contexts/DialogContext';
import { phone as fmtPhone } from '@utils/formatter';
import { goToLogin } from '@utils/navigationHelpers';
import { ScreenWrapper, Typography } from '@components/common';
import { screen, theme } from '@styles';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const MenuRow: React.FC<{ icon: IconName; label: string; desc?: string; onPress: () => void }> = ({
  icon,
  label,
  desc,
  onPress,
}) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    style={({ pressed }) => [styles.menuRow, pressed && { backgroundColor: theme.colors.gray50 }]}>
    <MaterialCommunityIcons name={icon} size={22} color={theme.colors.gray700} />
    <View style={{ flex: 1 }}>
      <Typography mode="body1" color="gray900">
        {label}
      </Typography>
      {!!desc && (
        <Typography mode="caption1" color="gray500">
          {desc}
        </Typography>
      )}
    </View>
    <MaterialCommunityIcons name="chevron-right" size={22} color={theme.colors.gray400} />
  </Pressable>
);

/** 마이페이지: 내 정보 · 배송지 · 결제수단 · 찜 · 주문내역 · 로그아웃 */
const MyPageScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { me, favoriteIds } = useSession();
  const { clear } = useCart();
  const { confirm } = useDialog();

  const handleLogout = async () => {
    const yes = await confirm({
      title: '로그아웃',
      message1: '로그아웃 할까요?',
      message2: '장바구니는 비워져요.',
      confirmText: '로그아웃',
      cancelText: '취소',
    });
    if (!yes) return;
    clear();
    await logout();
    goToLogin(navigation);
  };

  return (
    <ScreenWrapper backgroundColor={theme.colors.bg} inTab>
      <ScrollView contentContainerStyle={styles.container}>
        <Pressable onPress={() => navigation.navigate('ProfileEdit')} style={styles.profile} accessibilityRole="button" accessibilityLabel="내 정보 수정">
          <View style={styles.avatar}>
            <Typography mode="heading3" color="white">
              {me?.name?.slice(0, 1) ?? ''}
            </Typography>
          </View>
          <View style={{ flex: 1 }}>
            <Typography mode="subtitle1" color="gray900">
              {me?.name ?? ' '}
            </Typography>
            <Typography mode="caption1" color="gray500">
              {me ? `${me.loginId} · ${fmtPhone(me.phone)}` : ''}
            </Typography>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={22} color={theme.colors.gray400} />
        </Pressable>

        <View style={styles.card}>
          <MenuRow
            icon="map-marker-outline"
            label="배송지 관리"
            desc="배달 받을 주소를 등록하고 기본 주소를 정해요"
            onPress={() => navigation.navigate('AddressList')}
          />
          <View style={styles.sep} />
          <MenuRow
            icon="credit-card-outline"
            label="결제수단 관리"
            desc="카드를 등록하고 기본 결제수단을 정해요"
            onPress={() => navigation.navigate('PaymentMethodList')}
          />
          <View style={styles.sep} />
          <MenuRow
            icon="heart-outline"
            label="찜한 가게"
            desc={`${favoriteIds.length}곳`}
            onPress={() => navigation.navigate('Main', { screen: 'Favorites' })}
          />
          <View style={styles.sep} />
          <MenuRow
            icon="receipt-text-outline"
            label="주문내역"
            onPress={() => navigation.navigate('Main', { screen: 'Orders' })}
          />
        </View>

        <Pressable onPress={handleLogout} style={styles.logout} accessibilityRole="button">
          <Typography mode="body2" color="gray500">
            로그아웃
          </Typography>
        </Pressable>
        <Typography mode="caption1" color="gray400" style={{ textAlign: 'center' }}>
          Xoeat v{Application.nativeApplicationVersion ?? '0.1.0'}
        </Typography>
      </ScrollView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingTop: screen.topCard, gap: 12, paddingBottom: 32 },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.lg,
    padding: 16,
    boxShadow: theme.shadow.card,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.lg,
    paddingHorizontal: 16,
    boxShadow: theme.shadow.card,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    // 설명이 있는 줄(제목 24 + 설명 16 + 위아래 여백 12·12 = 64)에 맞춰 고정. 설명 없는 메뉴도 같은 높이에서 제목이 세로 가운데에 온다
    minHeight: 64,
    paddingVertical: 12,
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  sep: { height: 1, backgroundColor: theme.colors.gray100 },
  logout: { alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 16 },
});

export default MyPageScreen;

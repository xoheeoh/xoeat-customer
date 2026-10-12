import { Pressable, StyleSheet, View } from 'react-native';
import { Icon } from 'react-native-paper';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { RootStackParamList } from '@typ/navigation';
import Typography from './Typography';
import { NAV_ICON_BUTTON_SIZE } from './NavIconButton';
import { screen, theme } from '@styles';

interface HeaderProps {
  bgColor: string;
  title: string;
  /** 왼쪽 뒤로 가기 버튼 */
  leftButton?: boolean;
  /** 뒤로 가기 대신 할 일. 없으면 navigation.goBack() */
  leftEvent?: () => void;
}

/** 화면 위 제목 줄. 제목은 항상 가운데에 오도록 오른쪽에도 버튼과 같은 크기의 빈 칸을 둔다 */
const Header: React.FC<HeaderProps> = ({ bgColor, title, leftButton, leftEvent }) => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  return (
    <SafeAreaView style={{ backgroundColor: bgColor }} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable
          onPress={
            leftButton
              ? () => {
                  if (leftEvent) {
                    leftEvent();
                  } else {
                    navigation.goBack();
                  }
                }
              : () => undefined
          }
          style={({ pressed }) => [styles.button, pressed && leftButton && styles.pressed]}>
          {leftButton && <Icon source="chevron-left" size={26} color={theme.colors.gray900} />}
        </Pressable>
        {/* 화면 제목은 바텀시트 제목과 같은 subtitle1. 내용 첫 제목(heading3, 20 Bold)보다 작아 위계가 뒤집히지 않되 시트 제목보다 작지는 않다 */}
        <Typography mode="subtitle1" color="gray900" numberOfLines={1} style={styles.title}>
          {title}
        </Typography>
        <View style={styles.button} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  headerBar: {
    height: screen.headerHeight,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  title: { flex: 1, textAlign: 'center' },
  button: {
    width: NAV_ICON_BUTTON_SIZE,
    height: NAV_ICON_BUTTON_SIZE,
    borderRadius: NAV_ICON_BUTTON_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pressed: { backgroundColor: theme.colors.gray100 },
});

export default Header;
export { Header };

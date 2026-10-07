import { Pressable, StyleSheet } from 'react-native';
import { Icon } from 'react-native-paper';

import { theme } from '@styles';

/**
 * 상단 바(헤더, 대시보드 내비)에 놓이는 둥근 회색 아이콘 버튼.
 * 햄버거(menu)와 닫기(close) 버튼이 같은 위치·모양이 되도록 크기를 한곳에서 정한다.
 */
export const NAV_ICON_BUTTON_SIZE = 40;

interface NavIconButtonProps {
  /** react-native-paper Icon 이름 (예: 'menu', 'close') */
  icon: string;
  onPress: () => void;
  accessibilityLabel?: string;
  /** 아이콘 색. 기본은 진회색. 켜진 상태(예: 찜한 하트)를 메인색으로 보여줄 때 넘긴다 */
  iconColor?: string;
}

const NavIconButton: React.FC<NavIconButtonProps> = ({
  icon,
  onPress,
  accessibilityLabel,
  iconColor = theme.colors.gray800,
}) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel}
    style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    onPress={onPress}>
    <Icon source={icon} size={22} color={iconColor} />
  </Pressable>
);

const styles = StyleSheet.create({
  button: {
    width: NAV_ICON_BUTTON_SIZE,
    height: NAV_ICON_BUTTON_SIZE,
    borderRadius: NAV_ICON_BUTTON_SIZE / 2,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pressed: { backgroundColor: theme.colors.gray50 },
});

export default NavIconButton;
export { NavIconButton };

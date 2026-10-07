import { StyleSheet, View, ViewStyle } from 'react-native';

import Typography from './Typography';
import { theme } from '@styles';

export type BadgeTone = 'orange' | 'red' | 'blue' | 'purple' | 'gray' | 'green' | 'yellow';

interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  size?: 'small' | 'medium';
  style?: ViewStyle;
}

const TONES: Record<BadgeTone, { bg: keyof typeof theme.colors; fg: keyof typeof theme.colors }> = {
  orange: { bg: 'orange50', fg: 'orange700' },
  red: { bg: 'red50', fg: 'red600' },
  blue: { bg: 'blue50', fg: 'blue700' },
  purple: { bg: 'purple50', fg: 'purple700' },
  gray: { bg: 'gray100', fg: 'gray600' },
  green: { bg: 'green50', fg: 'green900' },
  yellow: { bg: 'yellow50', fg: 'yellow900' },
};

/** pill 형태 상태 배지. 주문 상태·판매 상태 표시에 쓴다 */
const Badge: React.FC<BadgeProps> = ({ label, tone = 'gray', size = 'small', style }) => {
  const { bg, fg } = TONES[tone];

  return (
    <View style={[styles.base, styles[size], { backgroundColor: theme.colors[bg] }, style]}>
      <Typography mode="subtitle4" color={fg} style={size === 'small' ? styles.smallText : undefined}>
        {label}
      </Typography>
    </View>
  );
};

const styles = StyleSheet.create({
  // alignSelf center: 가로 줄 안에서 옆 글자와 세로 가운데가 맞는다 (배지는 글자보다 키가 작아 위쪽 정렬이면 위로 붙어 보인다).
  // 세로로 쌓는 곳에 두면 가로 가운데로 가므로, 그때는 style 로 'flex-start' 를 넘긴다
  base: { alignSelf: 'center', alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
  small: { height: 20, paddingHorizontal: 7 },
  medium: { height: 26, paddingHorizontal: 10 },
  smallText: { fontSize: 11, lineHeight: 16, letterSpacing: -0.22 },
});

export default Badge;
export { Badge };

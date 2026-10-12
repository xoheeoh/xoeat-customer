import { Pressable, StyleSheet, View } from 'react-native';

import { Typography } from '@components/common';
import { theme } from '@styles';

interface CartBarProps {
  /** 담긴 수량 합계 (왼쪽 흰 동그라미) */
  count: number;
  /** 가운데 글자. 예) "연남 소반 · 14,500원" */
  text: string;
  onPress: () => void;
}

/** 화면 아래에 떠 있는 장바구니 바로가기 바. 홈과 가게 상세가 같이 쓴다 */
const CartBar: React.FC<CartBarProps> = ({ count, text, onPress }) => (
  <Pressable style={styles.bar} onPress={onPress} accessibilityRole="button" accessibilityLabel={`장바구니 보기, ${text}`}>
    <View style={styles.count}>
      <Typography mode="subtitle4" color="orange700">
        {count}
      </Typography>
    </View>
    <Typography mode="subtitle2" color="white" style={{ flex: 1 }} numberOfLines={1}>
      {text}
    </Typography>
    <Typography mode="subtitle2" color="white">
      장바구니 보기
    </Typography>
  </Pressable>
);

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    height: 56,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.gray900,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    boxShadow: theme.shadow.float,
  },
  count: { minWidth: 24, height: 24, borderRadius: 12, backgroundColor: theme.colors.white, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
});

export default CartBar;
export { CartBar };

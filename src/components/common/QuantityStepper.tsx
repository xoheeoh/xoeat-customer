import { Pressable, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import Typography from './Typography';
import { theme } from '@styles';

const MIN = 1;
const MAX = 99;

interface QuantityStepperProps {
  value: number;
  /** 1~99 로 잘라서 넘겨준다 */
  onChange: (next: number) => void;
  /**
   * lg: 메뉴 상세·옵션 수정 시트의 "수량" 줄 (버튼 36, 테두리 안쪽 여백)
   * sm: 장바구니 항목 옆 (버튼 32, 여백 없음)
   */
  size?: 'lg' | 'sm';
  /** 수량 1에서 빼기를 누르면 삭제. 넘기면 빼기 자리가 쓰레기통으로 바뀐다 */
  onRemove?: () => void;
  /** 쓰레기통 버튼의 접근성 라벨 (예: "떡볶이 삭제") */
  removeLabel?: string;
}

/** 수량 −/+ 버튼. 메뉴 상세, 옵션 수정 시트, 장바구니가 같이 쓴다 */
const QuantityStepper: React.FC<QuantityStepperProps> = ({ value, onChange, size = 'lg', onRemove, removeLabel }) => {
  const lg = size === 'lg';
  const iconSize = lg ? 20 : 18;
  const atMin = value <= MIN;
  const showRemove = atMin && !!onRemove;
  // lg 는 더 못 빼면 연하게, sm 은 항상 진회색(1에서는 쓰레기통)
  const minusColor = lg ? (atMin ? theme.colors.gray300 : theme.colors.gray900) : theme.colors.gray700;
  const plusColor = lg ? theme.colors.gray900 : theme.colors.gray700;

  return (
    <View style={lg ? styles.boxLg : styles.boxSm}>
      <Pressable
        onPress={() => (showRemove ? onRemove() : onChange(Math.max(MIN, value - 1)))}
        style={lg ? styles.btnLg : styles.btnSm}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={showRemove ? (removeLabel ?? '삭제') : '수량 빼기'}>
        <MaterialCommunityIcons name={showRemove ? 'trash-can-outline' : 'minus'} size={iconSize} color={minusColor} />
      </Pressable>
      <Typography mode={lg ? 'subtitle1' : 'subtitle3'} color="gray900" style={lg ? styles.countLg : styles.countSm}>
        {value}
      </Typography>
      <Pressable onPress={() => onChange(Math.min(MAX, value + 1))} style={lg ? styles.btnLg : styles.btnSm} hitSlop={6} accessibilityRole="button" accessibilityLabel="수량 더하기">
        <MaterialCommunityIcons name="plus" size={iconSize} color={plusColor} />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  boxLg: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: theme.colors.line, borderRadius: theme.radius.md, padding: 4 },
  boxSm: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: theme.colors.line, borderRadius: theme.radius.sm },
  btnLg: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  btnSm: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  countLg: { minWidth: 28, textAlign: 'center' },
  countSm: { minWidth: 24, textAlign: 'center' },
});

export default QuantityStepper;
export { QuantityStepper };

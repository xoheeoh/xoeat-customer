import { Dispatch, ReactNode, SetStateAction } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { Icon } from 'react-native-paper';
import BouncyCheckbox from 'react-native-bouncy-checkbox';
import { theme } from '@styles';

/** 체크박스 한 변 크기. 라디오 바깥 원(22)과 같다 */
const CHECKBOX_SIZE = 22;

interface CheckBoxProps {
  isChecked: boolean;
  setIsChecked: Dispatch<SetStateAction<boolean>>;
  labelComponent: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** 선택 불가(품절 등). 눌러도 반응하지 않고 연한 회색으로 가라앉힌다 */
  disabled?: boolean;
}

/**
 * 체크박스. 누르면 살짝 작아졌다 튕겨 돌아오는 효과가 있다 (react-native-bouncy-checkbox).
 * 체크 상태는 바깥(isChecked)이 결정한다. 라이브러리 내부 상태를 쓰지 않으므로, 바깥에서 변경을 거부해도(예: 최대 선택 수 초과) 표시가 어긋나지 않는다.
 * labelComponent 에 라벨뿐 아니라 가격·품절 표시 같은 한 줄 내용을 통째로 넣을 수 있다 (메뉴 옵션 등).
 */
const CheckBox: React.FC<CheckBoxProps> = ({ isChecked, setIsChecked, labelComponent, style, disabled = false }) => {
  const fill = disabled ? (isChecked ? theme.colors.gray300 : theme.colors.gray200) : isChecked ? theme.colors.primary : theme.colors.gray300;
  return (
    <BouncyCheckbox
      useBuiltInState={false}
      disabled={disabled}
      fillColor={fill}
      unFillColor="white" // 기본은 투명이라 회색 배경 화면에서 상자가 회색으로 보이므로 흰색으로 채운다
      isChecked={isChecked}
      style={[{ gap: 8, flexShrink: 1, alignSelf: 'flex-start' }, style]}
      innerIconStyle={{ borderRadius: 7, borderWidth: isChecked ? 0 : 1.5 }}
      onPress={() => setIsChecked(!isChecked)}
      textComponent={labelComponent}
      size={CHECKBOX_SIZE}
      iconStyle={{ borderRadius: 7 }}
      // 체크 전에는 아이콘을 그리지 않는다. 투명색으로 숨기면 안드로이드에서 검정으로 보인다
      iconComponent={isChecked ? <Icon source="check" size={16} color="white" /> : undefined}
    />
  );
};

export default CheckBox;
export { CheckBox };

import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Toast from 'react-native-toast-message';

import type { CartItem, Menu, Option, OptionGroup } from '@typ/domain';
import { won } from '@utils/formatter';
import { Badge, CheckBox, RadioIndicator, Typography, useRadioBounce } from '@components/common';
import { theme } from '@styles';

/** 그룹 id → 선택한 옵션 id 목록 */
export type OptionSelection = Record<string, string[]>;

/** 장바구니에 담긴 옵션 id 들로 선택 상태를 되살린다 (옵션 수정 시트의 초기값) */
export const selectionFromOptionIds = (menu: Menu, optionIds: string[]): OptionSelection => {
  const picked = new Set(optionIds);
  const selection: OptionSelection = {};
  menu.optionGroups.forEach((g) => {
    const ids = g.options.filter((o) => picked.has(o.id)).map((o) => o.id);
    if (ids.length) selection[g.id] = ids;
  });
  return selection;
};

/**
 * 메뉴 옵션 선택 상태와 규칙(필수=라디오, 선택=체크, 최소/최대)을 한곳에서 관리한다.
 * 메뉴 상세 화면과 장바구니의 옵션 수정 시트가 같이 쓴다.
 */
export const useMenuOptionSelection = (menu: Menu | null, initial: OptionSelection = {}) => {
  const [selected, setSelected] = useState<OptionSelection>(initial);

  const toggle = (g: OptionGroup, o: Option) => {
    if (o.soldOut) return;
    setSelected((prev) => {
      const cur = prev[g.id] ?? [];
      // 하나만 고르는 그룹: 다른 걸 누르면 바꾸고, 필수가 아니면 같은 걸 다시 눌러 해제할 수 있다
      if (g.maxSelect === 1) return { ...prev, [g.id]: cur.includes(o.id) && !g.required ? [] : [o.id] };
      if (cur.includes(o.id)) return { ...prev, [g.id]: cur.filter((id) => id !== o.id) };
      if (cur.length >= g.maxSelect) {
        Toast.show({ type: 'error', text1: `${g.name}은(는) 최대 ${g.maxSelect}개까지 선택할 수 있어요` });
        return prev;
      }
      return { ...prev, [g.id]: [...cur, o.id] };
    });
  };

  /** 아직 최소 개수를 못 채운 필수 그룹들 */
  const missing = useMemo(() => (menu?.optionGroups ?? []).filter((g) => g.required && (selected[g.id]?.length ?? 0) < g.minSelect), [menu, selected]);

  /** 선택한 옵션들을 장바구니에 담기는 형태로 */
  const chosen = useMemo<CartItem['options']>(() => {
    if (!menu) return [];
    return menu.optionGroups.flatMap((g) => g.options.filter((o) => (selected[g.id] ?? []).includes(o.id)).map((o) => ({ id: o.id, groupName: g.name, name: o.name, price: o.price })));
  }, [menu, selected]);

  /** 메뉴가 + 옵션가 */
  const unitPrice = (menu?.price ?? 0) + chosen.reduce((s, o) => s + o.price, 0);

  return { selected, setSelected, toggle, missing, chosen, unitPrice };
};

/** 선택 결과를 장바구니 항목으로 만든다. key 는 메뉴 + 옵션 조합이라 같은 조합이면 수량만 합쳐진다 */
export const toCartItem = (menu: Menu, chosen: CartItem['options'], quantity: number): CartItem => ({
  key: `${menu.id}:${chosen
    .map((o) => o.id)
    .sort()
    .join(',')}`,
  menuId: menu.id,
  menuName: menu.name,
  basePrice: menu.price,
  unitPrice: menu.price + chosen.reduce((s, o) => s + o.price, 0),
  quantity,
  options: chosen,
  adultOnly: menu.adultOnly,
});

interface MenuOptionGroupsProps {
  groups: OptionGroup[];
  selected: OptionSelection;
  onToggle: (group: OptionGroup, option: Option) => void;
  /** screen: 화면 본문용(좌우 여백 20, 그룹 사이 두꺼운 회색 띠). sheet: 바텀시트용(여백 없음, 얇은 구분선) */
  variant?: 'screen' | 'sheet';
}

/**
 * 옵션 그룹 목록. 그룹마다 제목 + 필수/선택 배지, 그 아래 옵션 줄.
 * 옵션 줄의 누르는 범위는 "표시(라디오/체크) + 라벨"까지. 빈 공간과 오른쪽 금액은 눌러도 반응하지 않는다.
 * 모양은 공통 Radio / CheckBox 부품과 같다 (사장님 앱과 동일). 체크박스는 누를 때 튕기는 효과까지 그대로
 */
const MenuOptionGroups: React.FC<MenuOptionGroupsProps> = ({ groups, selected, onToggle, variant = 'screen' }) => (
  <>
    {groups.map((g) => (
      <View key={g.id} style={variant === 'screen' ? styles.groupScreen : styles.groupSheet}>
        <View style={styles.groupHead}>
          <Typography mode="subtitle1" color="gray900">
            {g.name}
          </Typography>
          <Badge
            label={g.required ? `필수 · ${g.minSelect === g.maxSelect ? `${g.minSelect}개` : `${g.minSelect}~${g.maxSelect}개`}` : `선택 · 최대 ${g.maxSelect}개`}
            tone={g.required ? 'orange' : 'gray'}
          />
        </View>
        {g.options.map((o) => {
          const on = (selected[g.id] ?? []).includes(o.id);
          const label = (
            <Typography mode="body2" color={o.soldOut ? 'gray400' : 'gray900'} style={styles.optionLabel} numberOfLines={2}>
              {o.name}
              {o.soldOut ? '  (품절)' : ''}
            </Typography>
          );
          return (
            <View key={o.id} style={styles.option}>
              {g.maxSelect === 1 ? (
                <OptionRadio selected={on} disabled={o.soldOut} onPress={() => onToggle(g, o)}>
                  {label}
                </OptionRadio>
              ) : (
                <CheckBox isChecked={on} setIsChecked={() => onToggle(g, o)} disabled={o.soldOut} style={styles.optionPress} labelComponent={label} />
              )}
              <Typography mode="body2" color={o.soldOut ? 'gray400' : 'gray600'}>
                {o.price ? `+${won(o.price)}` : ''}
              </Typography>
            </View>
          );
        })}
      </View>
    ))}
  </>
);

/** 라디오 옵션의 누르는 영역(동그라미 + 라벨). 줄마다 눌림 효과 값을 따로 가져야 해서 컴포넌트로 분리했다 */
const OptionRadio: React.FC<{ selected: boolean; disabled: boolean; onPress: () => void; children: React.ReactNode }> = ({ selected, disabled, onPress, children }) => {
  const bounce = useRadioBounce();
  return (
    <Pressable
      style={styles.optionPress}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled }}
      onPressIn={bounce.onPressIn}
      onPressOut={bounce.onPressOut}
      onPress={() => {
        bounce.onPress();
        onPress();
      }}>
      <RadioIndicator selected={selected} disabled={disabled} style={bounce.style} />
      {children}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  groupScreen: { paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 8, borderBottomColor: theme.colors.gray50 },
  groupSheet: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.gray100 },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },  // 옵션 한 줄: 왼쪽 "표시 + 라벨"(누르는 영역), 오른쪽 금액. 공통 Radio 줄과 같은 높이(48)
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, height: 48 },
  // 누르는 영역. CheckBox 의 기본 간격(8)을 Radio 줄과 같은 10 으로 덮는다. 라벨이 길면 금액 자리를 침범하지 않고 줄어든다
  optionPress: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 48, flexShrink: 1 },
  // 라벨은 Radio 라벨처럼 body2 에서 굵기만 Medium
  optionLabel: { flexShrink: 1, fontFamily: 'Pretendard-Medium' },
});

export default MenuOptionGroups;
export { MenuOptionGroups };

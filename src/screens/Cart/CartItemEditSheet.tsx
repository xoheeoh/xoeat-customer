import { useEffect, useState } from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

import type { CartItem, Menu } from '@typ/domain';
import { getMenu } from '@apis/catalogApi';
import { isOk } from '@apis/client';
import { useCart } from '@contexts/CartContext';
import { won } from '@utils/formatter';
import { MenuOptionGroups, selectionFromOptionIds, toCartItem, useMenuOptionSelection } from '@components/store';
import { BottomSheet, PrimaryButton, SkeletonList, Typography } from '@components/common';
import { theme } from '@styles';

interface CartItemEditSheetProps {
  /** 수정할 장바구니 항목. null 이면 시트가 닫혀 있다 */
  item: CartItem | null;
  onClose: () => void;
}

/**
 * 장바구니에 담긴 메뉴의 옵션·수량을 고치는 바텀시트.
 * 메뉴 정보를 다시 불러와 현재 담긴 옵션을 선택 상태로 되살리고, "변경하기"를 누르면 장바구니 항목을 새 조합으로 바꾼다.
 */
const CartItemEditSheet: React.FC<CartItemEditSheetProps> = ({ item, onClose }) => {
  // 불러온 메뉴를 "어느 메뉴의 것인지"와 함께 둔다. 다른 항목을 열면 메뉴 id 가 달라져 자연스럽게 로딩 상태가 된다
  const [loaded, setLoaded] = useState<{ menuId: string; menu: Menu } | null>(null);
  const menuId = item?.menuId;

  useEffect(() => {
    if (!menuId) return;
    let alive = true;
    getMenu(menuId).then((res) => {
      if (alive && isOk(res) && res.menu) setLoaded({ menuId, menu: res.menu });
    });
    return () => {
      alive = false;
    };
  }, [menuId]);

  const menu = item && loaded?.menuId === item.menuId ? loaded.menu : null;

  return (
    <BottomSheet
      visible={!!item}
      setVisible={(v) => {
        if (!v) onClose();
      }}
      title={item?.menuName ?? ''}
      // 항목이 바뀌면 key 로 내용을 새로 만들어 선택 상태를 초기화한다
      content={item && menu ? <EditBody key={item.key} item={item} menu={menu} onDone={onClose} /> : <SkeletonList rows={3} />}
    />
  );
};

const EditBody: React.FC<{ item: CartItem; menu: Menu; onDone: () => void }> = ({ item, menu, onDone }) => {
  const { replace } = useCart();
  const { selected, toggle, missing, chosen, unitPrice } = useMenuOptionSelection(
    menu,
    selectionFromOptionIds(
      menu,
      item.options.map((o) => o.id),
    ),
  );
  const [qty, setQty] = useState(item.quantity);

  const save = () => {
    if (missing.length) {
      Toast.show({ type: 'error', text1: `${missing[0].name}을(를) 선택해 주세요` });
      return;
    }
    replace(item.key, toCartItem(menu, chosen, qty));
    Toast.show({ type: 'success', text1: '옵션을 변경했어요' });
    onDone();
  };

  return (
    <View style={styles.body}>
      {/* 옵션이 많으면 시트 안에서 스크롤. 화면의 절반 남짓까지만 차지한다 */}
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {menu.optionGroups.length > 0 ? (
          <MenuOptionGroups groups={menu.optionGroups} selected={selected} onToggle={toggle} variant="sheet" />
        ) : (
          <Typography mode="body2" color="gray500" style={{ paddingVertical: 12 }}>
            선택할 옵션이 없는 메뉴예요. 수량만 바꿀 수 있어요.
          </Typography>
        )}

        <View style={styles.qtyRow}>
          <Typography mode="subtitle1" color="gray900">
            수량
          </Typography>
          <View style={styles.stepper}>
            <Pressable onPress={() => setQty((q) => Math.max(1, q - 1))} style={styles.stepBtn} hitSlop={6}>
              <MaterialCommunityIcons name="minus" size={20} color={qty > 1 ? theme.colors.gray900 : theme.colors.gray300} />
            </Pressable>
            <Typography mode="subtitle1" color="gray900" style={{ minWidth: 28, textAlign: 'center' }}>
              {qty}
            </Typography>
            <Pressable onPress={() => setQty((q) => Math.min(99, q + 1))} style={styles.stepBtn} hitSlop={6}>
              <MaterialCommunityIcons name="plus" size={20} color={theme.colors.gray900} />
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <PrimaryButton label={`${won(unitPrice * qty)} 변경하기`} onPress={save} disabled={missing.length > 0} />
    </View>
  );
};

const styles = StyleSheet.create({
  body: { gap: 12 },
  scroll: { maxHeight: Dimensions.get('window').height * 0.55 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: theme.colors.line, borderRadius: theme.radius.md, padding: 4 },
  stepBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
});

export default CartItemEditSheet;
export { CartItemEditSheet };

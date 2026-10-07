import { Image, Pressable, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { won } from '@utils/formatter';
import type { Menu } from '@typ/domain';
import { AdultBadge, Badge, Typography } from '@components/common';
import { theme } from '@styles';

/** 가게 상세의 메뉴 한 줄 */
const MenuRow: React.FC<{ menu: Menu; onPress: () => void }> = ({ menu, onPress }) => {
  const soldOut = menu.saleStatus !== 'ON_SALE';
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && { backgroundColor: theme.colors.gray50 }]}>
      <View style={{ flex: 1, gap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Typography mode="subtitle2" color={soldOut ? 'gray400' : 'gray900'} numberOfLines={1} style={{ flexShrink: 1 }}>
            {menu.name}
          </Typography>
          {/* 글자는 줄 상자 안에서 살짝 위로 보이므로 마크를 1px 올려 눈으로 보기에 가운데가 되게 한다 (사장님 앱과 동일) */}
          {menu.adultOnly && <AdultBadge style={{ transform: [{ translateY: -1 }] }} />}
          {soldOut && <Badge label="품절" tone="gray" />}
        </View>
        {!!menu.description && (
          <Typography mode="caption1" color="gray500" numberOfLines={2}>
            {menu.description}
          </Typography>
        )}
        <Typography mode="subtitle3" color={soldOut ? 'gray400' : 'gray900'}>
          {won(menu.price)}
          {menu.standard ? <Typography mode="caption1" color="gray500">  {menu.standard}</Typography> : null}
        </Typography>
      </View>
      {menu.imageUrl ? (
        <Image source={{ uri: menu.imageUrl }} style={[styles.thumb, soldOut && { opacity: 0.5 }]} />
      ) : (
        <View style={[styles.thumb, styles.thumbEmpty]}>
          <MaterialCommunityIcons name="food" size={22} color={theme.colors.gray300} />
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 14 },
  thumb: { width: 76, height: 76, borderRadius: theme.radius.md, backgroundColor: theme.colors.gray100 },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
});

export default MenuRow;
export { MenuRow };

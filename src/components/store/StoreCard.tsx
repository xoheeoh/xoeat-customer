import { Image, Pressable, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { CATEGORIES, categoryLabel } from '@dt/constants';
import { won } from '@utils/formatter';
import type { Store } from '@typ/domain';
import { Badge, Typography } from '@components/common';
import { theme } from '@styles';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface StoreCardProps {
  store: Store;
  onPress: () => void;
  onToggleFavorite: () => void;
}

/** 가게 목록 카드: 대표 이미지(없으면 업종 아이콘) · 이름 · 배달 시간 · 배달비 · 최소주문 · 찜 */
const StoreCard: React.FC<StoreCardProps> = ({ store, onPress, onToggleFavorite }) => {
  const icon = (CATEGORIES.find((c) => c.code === store.categoryCd)?.icon ?? 'silverware-fork-knife') as IconName;
  const closed = !store.isOpenNow;

  // 카드 자체에는 button 역할을 주지 않는다. 안의 찜 버튼과 겹쳐 웹에서 <button> 안에 <button> 이 되어 경고가 난다
  return (
    <Pressable onPress={onPress} accessibilityLabel={`${store.name} 가게 보기`} style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}>
      <View style={styles.imageWrap}>
        {store.imageUrl ? (
          <Image source={{ uri: store.imageUrl }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.imageEmpty]}>
            <MaterialCommunityIcons name={icon} size={30} color={theme.colors.orange300} />
          </View>
        )}
        {closed && (
          <View style={styles.closedOverlay}>
            <Typography mode="subtitle4" color="white">
              {store.status === 'PAUSED' ? '잠시 중지' : '준비중'}
            </Typography>
          </View>
        )}
      </View>

      <View style={{ flex: 1, gap: 4 }}>
        <View style={styles.nameRow}>
          <Typography mode="subtitle2" color={closed ? 'gray500' : 'gray900'} numberOfLines={1} style={{ flexShrink: 1 }}>
            {store.name}
          </Typography>
          <Pressable onPress={onToggleFavorite} hitSlop={10} accessibilityRole="button" accessibilityLabel="찜" accessibilityState={{ selected: store.isFavorite }}>
            <MaterialCommunityIcons name={store.isFavorite ? 'heart' : 'heart-outline'} size={22} color={store.isFavorite ? theme.colors.primary : theme.colors.gray300} />
          </Pressable>
        </View>
        <Typography mode="caption1" color="gray500" numberOfLines={1}>
          {categoryLabel(store.categoryCd)} · {store.intro}
        </Typography>
        <View style={styles.metaRow}>
          <Badge label={`${store.deliveryMinutesMin}~${store.deliveryMinutesMax}분`} tone="gray" />
          <Typography mode="caption1" color="gray600">
            배달비 {store.deliveryFee ? won(store.deliveryFee) : '무료'} · 최소주문 {won(store.minOrderAmount)}
          </Typography>
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: { flexDirection: 'row', gap: 12, paddingVertical: 12 },
  imageWrap: { position: 'relative' },
  image: { width: 88, height: 88, borderRadius: theme.radius.md, backgroundColor: theme.colors.gray100 },
  imageEmpty: { alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.orange50 },
  closedOverlay: { position: 'absolute', inset: 0, borderRadius: theme.radius.md, backgroundColor: 'rgba(28,25,23,0.55)', alignItems: 'center', justifyContent: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
});

export default StoreCard;
export { StoreCard };

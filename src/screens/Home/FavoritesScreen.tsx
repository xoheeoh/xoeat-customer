import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

import type { RootStackParamList } from '@typ/navigation';
import type { Store } from '@typ/domain';
import { getStores } from '@apis/catalogApi';
import { setFavorite } from '@apis/customerApi';
import { isOk } from '@apis/client';
import { useSession } from '@contexts/SessionContext';
import { StoreCard } from '@components/store';
import { ScreenWrapper, SkeletonList, Typography } from '@components/common';
import { theme } from '@styles';

/** 찜한 가게 목록 */
const FavoritesScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { me, favoriteIds, setFavoriteIds } = useSession();
  const [stores, setStores] = useState<Store[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      getStores(favoriteIds).then((res) => setStores(isOk(res) && res.stores ? res.stores.filter((s) => s.isFavorite) : []));
    }, [favoriteIds]),
  );

  const unfavorite = async (store: Store) => {
    if (!me) return;
    setStores((prev) => (prev ?? []).filter((s) => s.id !== store.id));
    setFavoriteIds(favoriteIds.filter((id) => id !== store.id));
    const res = await setFavorite(store.id, false, me.id);
    if (!isOk(res)) Toast.show({ type: 'error', text1: res.resultMsg });
  };

  return (
    <ScreenWrapper backgroundColor="white" inTab>
      {stores === null ? (
        <View style={{ padding: 20 }}>
          <SkeletonList rows={4} />
        </View>
      ) : (
        <FlatList
          data={stores}
          keyExtractor={(s) => s.id}
          contentContainerStyle={{ paddingHorizontal: 20, flexGrow: 1 }}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          renderItem={({ item }) => <StoreCard store={item} onPress={() => navigation.navigate('StoreDetail', { storeId: item.id })} onToggleFavorite={() => unfavorite(item)} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <MaterialCommunityIcons name="heart-outline" size={40} color={theme.colors.gray300} />
              <Typography mode="body1" color="gray500">
                아직 찜한 가게가 없어요
              </Typography>
              <Typography mode="caption1" color="gray400">
                가게 목록에서 하트를 눌러 보세요
              </Typography>
            </View>
          }
        />
      )}
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  sep: { height: 1, backgroundColor: theme.colors.gray100 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 80 },
});

export default FavoritesScreen;

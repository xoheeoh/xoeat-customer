import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import type { RootStackParamList } from '@typ/navigation';
import type { Store } from '@typ/domain';
import { getStore } from '@apis/catalogApi';
import { isOk } from '@apis/client';
import { DAY_LABELS, categoryLabel } from '@dt/constants';
import { phone as fmtPhone, timeKo } from '@utils/formatter';
import { ScreenWrapper, SkeletonList, Typography } from '@components/common';
import { theme } from '@styles';

type Props = NativeStackScreenProps<RootStackParamList, 'StoreInfo'>;

/** 가게 정보: 영업시간 · 주소 · 전화 · 업종 · 원산지. 가게 상세의 "가게 정보 >" 에서 들어온다 */
const StoreInfoScreen: React.FC<Props> = ({ route }) => {
  const { storeId } = route.params;
  const [store, setStore] = useState<Store | null>(null);

  useEffect(() => {
    getStore(storeId).then((res) => isOk(res) && res.store && setStore(res.store));
  }, [storeId]);

  return (
    <ScreenWrapper backgroundColor="white">
      <ScrollView contentContainerStyle={styles.container}>
        {!store ? (
          <SkeletonList rows={4} />
        ) : (
          <>
            <Typography mode="heading3" color="gray900">
              {store.name}
            </Typography>

            <InfoBlock title="영업시간">
              {store.hours.map((h) => (
                <View key={h.dayOfWeek} style={styles.hourRow}>
                  <Typography mode="body2" color="gray600" style={{ width: 32 }}>
                    {DAY_LABELS[h.dayOfWeek]}
                  </Typography>
                  <Typography mode="body2" color={h.enabled ? 'gray900' : 'gray400'}>
                    {h.enabled ? `${timeKo(h.openTime)} ~ ${timeKo(h.closeTime)}${h.breakFrom ? `  (휴게 ${h.breakFrom}~${h.breakTo})` : ''}` : '휴무'}
                  </Typography>
                </View>
              ))}
            </InfoBlock>

            <InfoBlock title="가게 정보">
              <Typography mode="body2" color="gray900">
                {store.address}
              </Typography>
              <Pressable onPress={() => Linking.openURL(`tel:${store.phone.replace(/-/g, '')}`)} style={styles.phoneRow}>
                <Typography mode="body2" color="blue600">
                  {fmtPhone(store.phone)}
                </Typography>
                <MaterialCommunityIcons name="phone-outline" size={16} color={theme.colors.blue600} />
              </Pressable>
              <Typography mode="caption1" color="gray500">
                업종 {categoryLabel(store.categoryCd)}
              </Typography>
            </InfoBlock>

            {!!store.originInfo && (
              <InfoBlock title="원산지 표시">
                <Typography mode="body2" color="gray700">
                  {store.originInfo}
                </Typography>
              </InfoBlock>
            )}
          </>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
};

const InfoBlock: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <View style={{ gap: 8 }}>
    <Typography mode="subtitle2" color="gray900">
      {title}
    </Typography>
    {children}
  </View>
);

const styles = StyleSheet.create({
  container: { padding: 20, gap: 24 },
  hourRow: { flexDirection: 'row', gap: 8 },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});

export default StoreInfoScreen;

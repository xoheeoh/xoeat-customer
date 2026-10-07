import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

import type { RootStackParamList } from '@typ/navigation';
import type { Address } from '@typ/domain';
import { deleteAddress, getAddresses, setDefaultAddress } from '@apis/customerApi';
import { isOk } from '@apis/client';
import { useDialog } from '@contexts/DialogContext';
import { Badge, PrimaryButton, RadioIndicator, ScreenWrapper, SkeletonList, Typography } from '@components/common';
import { theme } from '@styles';

type Props = NativeStackScreenProps<RootStackParamList, 'AddressList'>;

/**
 * 배송지 목록. selectMode 면 누르는 주소를 기본 배송지로 지정하고 돌아간다 (주문 화면이 기본 주소를 다시 읽는다).
 */
const AddressListScreen: React.FC<Props> = ({ navigation, route }) => {
  const selectMode = route.params?.selectMode ?? false;
  const { confirm } = useDialog();
  const [list, setList] = useState<Address[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      getAddresses().then((res) => setList(isOk(res) && res.addresses ? res.addresses : []));
    }, []),
  );

  const makeDefault = async (a: Address) => {
    const res = await setDefaultAddress(a.id);
    if (!isOk(res)) {
      Toast.show({ type: 'error', text1: res.resultMsg });
      return;
    }
    setList((prev) => (prev ?? []).map((x) => ({ ...x, isDefault: x.id === a.id })));
    if (selectMode) navigation.goBack();
    else Toast.show({ type: 'success', text1: '기본 배송지로 설정했어요' });
  };

  const remove = async (a: Address) => {
    const yes = await confirm({ title: '배송지 삭제', message1: `'${a.label || a.roadAddress}'을(를) 삭제할까요?`, confirmText: '삭제', cancelText: '취소' });
    if (!yes) return;
    const res = await deleteAddress(a.id);
    if (isOk(res)) setList((prev) => (prev ?? []).filter((x) => x.id !== a.id));
    else Toast.show({ type: 'error', text1: res.resultMsg });
  };

  return (
    <ScreenWrapper backgroundColor="white">
      {list === null ? (
        <View style={{ padding: 20 }}>
          <SkeletonList rows={3} />
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(a) => a.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          renderItem={({ item }) => (
            <Pressable onPress={() => (selectMode ? makeDefault(item) : navigation.navigate('AddressEdit', { addressId: item.id }))} style={styles.row}>
              <MaterialCommunityIcons name={item.label === '회사' ? 'office-building-outline' : 'home-outline'} size={22} color={item.isDefault ? theme.colors.primary : theme.colors.gray500} />
              <View style={{ flex: 1, gap: 2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Typography mode="subtitle2" color="gray900">
                    {item.label || '배송지'}
                  </Typography>
                  {item.isDefault && <Badge label="기본" tone="orange" />}
                </View>
                <Typography mode="body2" color="gray700">
                  {item.roadAddress}
                </Typography>
                {!!item.detail && (
                  <Typography mode="caption1" color="gray500">
                    {item.detail}
                  </Typography>
                )}
                {!selectMode && (
                  <View style={styles.actions}>
                    {!item.isDefault && (
                      <Pressable onPress={() => makeDefault(item)} hitSlop={6}>
                        <Typography mode="caption1" color="orange700">
                          기본으로 설정
                        </Typography>
                      </Pressable>
                    )}
                    <Pressable onPress={() => navigation.navigate('AddressEdit', { addressId: item.id })} hitSlop={6}>
                      <Typography mode="caption1" color="gray600">
                        수정
                      </Typography>
                    </Pressable>
                    <Pressable onPress={() => remove(item)} hitSlop={6}>
                      <Typography mode="caption1" color="red600">
                        삭제
                      </Typography>
                    </Pressable>
                  </View>
                )}
              </View>
              {/* 공통 라디오 모양. 줄이 위쪽 정렬이라 첫 줄 글자(줄높이 24)와 가운데가 맞도록 1px 내린다 */}
              {selectMode && <RadioIndicator selected={item.isDefault} style={styles.radio} />}
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <MaterialCommunityIcons name="map-marker-plus-outline" size={40} color={theme.colors.gray300} />
              <Typography mode="body1" color="gray500">
                등록된 배송지가 없어요
              </Typography>
            </View>
          }
          ListFooterComponent={<PrimaryButton label="+ 새 배송지 추가" size="md" buttonColor={theme.colors.white} onPress={() => navigation.navigate('AddressEdit')} style={{ marginTop: 16 }} />}
        />
      )}
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  list: { padding: 20, flexGrow: 1 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 14 },
  radio: { marginTop: 1 },
  actions: { flexDirection: 'row', gap: 14, marginTop: 6 },
  sep: { height: 1, backgroundColor: theme.colors.gray100 },
  empty: { alignItems: 'center', gap: 12, paddingVertical: 60 },
});

export default AddressListScreen;

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
import { nudgeUp, screen, theme } from '@styles';

type Props = NativeStackScreenProps<RootStackParamList, 'AddressList'>;
type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

/**
 * 배송지 라벨별 아이콘. 칸(22) 안에서 눈에 보이는 크기가 비슷해지도록 크기를 따로 맞췄다.
 * - 회사(빌딩)는 꽉 찬 네모라 같은 크기면 커 보여 작게.
 * - 기타는 특정 장소가 아닌 "어떤 장소"라 위치 핀. 집·회사 외 라벨(직접 입력 등)도 여기에 해당한다.
 */
const LABEL_ICONS: Record<string, { name: IconName; size: number }> = {
  집: { name: 'home-outline', size: 22 },
  회사: { name: 'office-building-outline', size: 18 },
};
const OTHER_ICON = { name: 'map-marker-outline' as IconName, size: 22 };
const labelIcon = (label: string) => LABEL_ICONS[label] ?? OTHER_ICON;

/**
 * 배송지 목록.
 * - 관리 모드(마이페이지·홈): 기본 배송지 지정·수정·삭제.
 * - 선택 모드(주문 화면의 "변경"): 누른 주소를 이번 주문의 배달 주소로만 돌려준다. 기본 배송지는 바꾸지 않는다.
 */
const AddressListScreen: React.FC<Props> = ({ navigation, route }) => {
  const selectMode = route.params?.selectMode ?? false;
  /** 선택 모드에서 라디오가 켜질 주소. 주문 화면이 넘겨준 현재 선택, 없으면 기본 주소 */
  const selectedId = route.params?.selectedId;
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
    Toast.show({ type: 'success', text1: '기본 배송지로 설정했어요' });
  };

  /** 선택 모드: 고른 주소를 주문 화면에 넘기며 돌아간다 (기본 배송지는 그대로) */
  const pickForOrder = (a: Address) => navigation.popTo('Checkout', { addressId: a.id }, { merge: true });

  const remove = async (a: Address) => {
    const yes = await confirm({
      title: '배송지 삭제',
      message1: `'${a.label || a.roadAddress}'을(를) 삭제할까요?`,
      confirmText: '삭제',
      cancelText: '취소',
    });
    if (!yes) return;
    const res = await deleteAddress(a.id);
    if (!isOk(res)) {
      Toast.show({ type: 'error', text1: res.resultMsg });
      return;
    }
    // 기본 배송지를 지우면 서버가 남은 주소 중 하나를 자동으로 기본으로 올린다 (ensure_default_exists 트리거).
    // 어느 주소가 됐는지 화면이 알 수 없으므로 목록을 다시 읽는다
    const latest = await getAddresses();
    setList(isOk(latest) && latest.addresses ? latest.addresses : (list ?? []).filter((x) => x.id !== a.id));
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
            <Pressable
              onPress={() =>
                selectMode ? pickForOrder(item) : navigation.navigate('AddressEdit', { addressId: item.id })
              }
              style={styles.row}>
              {/* 칸은 22 로 고정하고 그 안에서 가운데 정렬. 아이콘마다 눈에 보이는 크기가 달라 크기를 따로 둔다 (LABEL_ICONS 참고) */}
              <View style={styles.labelIcon}>
                <MaterialCommunityIcons
                  name={labelIcon(item.label).name}
                  size={labelIcon(item.label).size}
                  color={item.isDefault ? theme.colors.primary : theme.colors.gray500}
                />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Typography mode="subtitle2" color="gray900">
                    {item.label || '배송지'}
                  </Typography>
                  {item.isDefault && <Badge label="기본" tone="orange" style={nudgeUp} />}
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
                      <Pressable onPress={() => makeDefault(item)} hitSlop={6} accessibilityRole="button" accessibilityLabel={`${item.label || '배송지'}를 기본으로 설정`}>
                        <Typography mode="caption1" color="orange700">
                          기본으로 설정
                        </Typography>
                      </Pressable>
                    )}
                    <Pressable onPress={() => navigation.navigate('AddressEdit', { addressId: item.id })} hitSlop={6} accessibilityRole="button" accessibilityLabel={`${item.label || '배송지'} 수정`}>
                      <Typography mode="caption1" color="gray600">
                        수정
                      </Typography>
                    </Pressable>
                    <Pressable onPress={() => remove(item)} hitSlop={6} accessibilityRole="button" accessibilityLabel={`${item.label || '배송지'} 삭제`}>
                      <Typography mode="caption1" color="red600">
                        삭제
                      </Typography>
                    </Pressable>
                  </View>
                )}
              </View>
              {/* 공통 라디오 모양. 줄이 위쪽 정렬이라 첫 줄 글자(줄높이 24)와 가운데가 맞도록 1px 내린다 */}
              {selectMode && (
                <RadioIndicator selected={selectedId ? item.id === selectedId : item.isDefault} style={styles.radio} />
              )}
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
          ListFooterComponent={
            <PrimaryButton
              label="+ 새 배송지 추가"
              size="md"
              buttonColor={theme.colors.white}
              onPress={() => navigation.navigate('AddressEdit')}
              style={{ marginTop: 16 }}
            />
          }
        />
      )}
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  list: { paddingHorizontal: 20, paddingTop: screen.topCard, paddingBottom: 20, flexGrow: 1 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 14 },
  radio: { marginTop: 1 },
  labelIcon: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', gap: 14, marginTop: 6 },
  sep: { height: 1, backgroundColor: theme.colors.gray100 },
  empty: { alignItems: 'center', gap: 12, paddingVertical: 60 },
});

export default AddressListScreen;

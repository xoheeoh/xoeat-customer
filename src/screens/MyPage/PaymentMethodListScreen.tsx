import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

import type { RootStackParamList } from '@typ/navigation';
import type { PaymentMethod } from '@typ/domain';
import { deletePaymentMethod, getPaymentMethods, setDefaultPaymentMethod } from '@apis/customerApi';
import { isOk } from '@apis/client';
import { useDialog } from '@contexts/DialogContext';
import { cardBrandColor } from '@dt/constants';
import { Badge, InfoBox, PrimaryButton, RadioIndicator, ScreenWrapper, SkeletonList, Typography } from '@components/common';
import { theme } from '@styles';

type Props = NativeStackScreenProps<RootStackParamList, 'PaymentMethodList'>;

/**
 * 결제수단 목록.
 * - 관리 모드(마이페이지): 기본 결제수단 지정·삭제.
 * - 선택 모드(주문 화면의 "변경"): 누른 카드를 이번 주문의 결제수단으로만 돌려준다. 기본 결제수단은 바꾸지 않는다.
 */
const PaymentMethodListScreen: React.FC<Props> = ({ navigation, route }) => {
  const selectMode = route.params?.selectMode ?? false;
  /** 선택 모드에서 강조할 카드. 주문 화면이 넘겨준 현재 선택, 없으면 기본 카드 */
  const selectedId = route.params?.selectedId;
  const isPicked = (m: PaymentMethod) => (selectedId ? m.id === selectedId : m.isDefault);
  const { confirm } = useDialog();
  const [list, setList] = useState<PaymentMethod[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      getPaymentMethods().then((res) => setList(isOk(res) && res.methods ? res.methods : []));
    }, []),
  );

  const makeDefault = async (m: PaymentMethod) => {
    const res = await setDefaultPaymentMethod(m.id);
    if (!isOk(res)) {
      Toast.show({ type: 'error', text1: res.resultMsg });
      return;
    }
    setList((prev) => (prev ?? []).map((x) => ({ ...x, isDefault: x.id === m.id })));
    Toast.show({ type: 'success', text1: '기본 결제수단으로 설정했어요' });
  };

  /** 선택 모드: 고른 카드를 주문 화면에 넘기며 돌아간다 (기본 결제수단은 그대로) */
  const pickForOrder = (m: PaymentMethod) => navigation.popTo('Checkout', { methodId: m.id }, { merge: true });

  const remove = async (m: PaymentMethod) => {
    const yes = await confirm({ title: '카드 삭제', message1: `${m.brand}카드 **** ${m.last4}를 삭제할까요?`, confirmText: '삭제', cancelText: '취소' });
    if (!yes) return;
    const res = await deletePaymentMethod(m.id);
    if (isOk(res)) setList((prev) => (prev ?? []).filter((x) => x.id !== m.id));
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
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable onPress={() => (selectMode ? pickForOrder(item) : undefined)} style={[styles.cardRow, selectMode && isPicked(item) && styles.cardRowOn]}>
              <View style={[styles.cardArt, { backgroundColor: cardBrandColor(item.brand) }]}>
                <Typography mode="caption2" color="white">
                  {item.brand}
                </Typography>
                <Typography mode="caption1" color="white">
                  •••• {item.last4}
                </Typography>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Typography mode="subtitle2" color="gray900">
                    {item.brand}카드
                  </Typography>
                  {/* 선택된 줄은 배경이 배지와 같은 연한 주황이라 배지가 묻힌다. 그때만 배지 배경을 흰색으로 */}
                  {item.isDefault && <Badge label="기본" tone="orange" style={selectMode && isPicked(item) ? styles.badgeOnPicked : undefined} />}
                </View>
                <Typography mode="caption1" color="gray500">
                  **** **** **** {item.last4} · {item.expiry}
                  {item.alias ? ` · ${item.alias}` : ''}
                </Typography>
                {!selectMode && (
                  <View style={styles.actions}>
                    {!item.isDefault && (
                      <Pressable onPress={() => makeDefault(item)} hitSlop={6}>
                        <Typography mode="caption1" color="orange700">
                          기본으로 설정
                        </Typography>
                      </Pressable>
                    )}
                    <Pressable onPress={() => remove(item)} hitSlop={6}>
                      <Typography mode="caption1" color="red600">
                        삭제
                      </Typography>
                    </Pressable>
                  </View>
                )}
              </View>
              {/* 공통 라디오 모양 */}
              {selectMode && <RadioIndicator selected={isPicked(item)} />}
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <MaterialCommunityIcons name="credit-card-plus-outline" size={40} color={theme.colors.gray300} />
              <Typography mode="body1" color="gray500">
                등록된 카드가 없어요
              </Typography>
            </View>
          }
          ListFooterComponent={
            <View style={{ gap: 12, marginTop: 8 }}>
              <PrimaryButton label="+ 카드 등록" size="md" buttonColor={theme.colors.white} onPress={() => navigation.navigate('PaymentMethodAdd')} />
              <InfoBox icon="shield-check-outline">카드번호는 서버에 저장되지 않고 끝 4자리만 보관해요. 실제 결제는 일어나지 않는 데모예요.</InfoBox>
            </View>
          }
        />
      )}
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  list: { padding: 20, gap: 10, flexGrow: 1 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.line },
  cardRowOn: { borderColor: theme.colors.primary, backgroundColor: theme.colors.orange50 },
  badgeOnPicked: { backgroundColor: theme.colors.white },
  cardArt: { width: 72, height: 46, borderRadius: 8, padding: 7, justifyContent: 'space-between' },
  actions: { flexDirection: 'row', gap: 14, marginTop: 6 },
  empty: { alignItems: 'center', gap: 12, paddingVertical: 40 },
});

export default PaymentMethodListScreen;

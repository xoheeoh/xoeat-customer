import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';

import type { RootStackParamList } from '@typ/navigation';
import { getAddresses, saveAddress, setDefaultAddress } from '@apis/customerApi';
import { isOk } from '@apis/client';
import { useSession } from '@contexts/SessionContext';
import { useDialog } from '@contexts/DialogContext';
import { loadingController } from '@utils/loadingController';
import { BOTTOM_BTN_BOX_HEIGHT, BottomBtnBox, CheckBox, InfoBox, KeyboardAwareScrollView, ScreenWrapper, TextField, Typography } from '@components/common';
import { screen, theme } from '@styles';

type Props = NativeStackScreenProps<RootStackParamList, 'AddressEdit'>;
const LABELS = ['집', '회사', '기타'];

/** 배송지 추가·수정. 데모는 지도·우편번호 검색 없이 도로명 주소를 직접 입력한다 */
const AddressEditScreen: React.FC<Props> = ({ navigation, route }) => {
  const addressId = route.params?.addressId;
  const { me } = useSession();
  const { alert } = useDialog();
  const [label, setLabel] = useState('집');
  const [road, setRoad] = useState('');
  const [detail, setDetail] = useState('');
  const [makeDefault, setMakeDefault] = useState(!addressId);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!addressId) return;
    getAddresses().then((res) => {
      const a = (isOk(res) && res.addresses ? res.addresses : []).find((x) => x.id === addressId);
      if (a) {
        setLabel(a.label || '기타');
        setRoad(a.roadAddress);
        setDetail(a.detail);
        setMakeDefault(a.isDefault);
      }
    });
  }, [addressId]);

  const valid = road.trim().length >= 2;

  const save = async () => {
    if (!me || !valid || saving) return;
    setSaving(true);
    loadingController.start();
    const res = await saveAddress({ id: addressId, label, roadAddress: road, detail }, me.id);
    if (isOk(res) && res.address && makeDefault) await setDefaultAddress(res.address.id);
    loadingController.stop();
    setSaving(false);
    if (!isOk(res)) {
      await alert({ title: '배송지', message1: res.resultMsg });
      return;
    }
    Toast.show({ type: 'success', text1: addressId ? '배송지를 수정했어요' : '배송지를 추가했어요' });
    navigation.goBack();
  };

  return (
    <ScreenWrapper backgroundColor="white" keyboardBottomInset={BOTTOM_BTN_BOX_HEIGHT}>
      <KeyboardAwareScrollView contentContainerStyle={styles.container} keyboardAccessoryHeight={BOTTOM_BTN_BOX_HEIGHT}>
        <View>
          <Typography mode="subtitle3" color="gray700" style={{ marginBottom: 8 }}>
            주소 이름
          </Typography>
          <View style={styles.labels}>
            {LABELS.map((l) => (
              <Pressable key={l} onPress={() => setLabel(l)} style={[styles.labelChip, label === l && styles.labelChipOn]}>
                <Typography mode="subtitle3" color={label === l ? 'orange700' : 'gray600'}>
                  {l}
                </Typography>
              </Pressable>
            ))}
          </View>
        </View>
        <TextField id="road" inputMode="text" label="도로명 주소" placeholder="예) 서울 마포구 연남로 12" value={road} onChangeText={setRoad} maxLength={200} />
        <TextField id="detail" inputMode="text" label="상세 주소" placeholder="동·호수, 층 등" value={detail} onChangeText={setDetail} maxLength={100} />
        <CheckBox
          isChecked={makeDefault}
          setIsChecked={setMakeDefault}
          labelComponent={
            <Typography mode="body2" color="gray700">
              기본 배송지로 설정
            </Typography>
          }
        />
        <InfoBox>데모에서는 지도·우편번호 검색 없이 주소를 직접 입력해요. 가게 목록은 마포구 기준으로 고정되어 있어요.</InfoBox>
      </KeyboardAwareScrollView>
      <BottomBtnBox label="저장" onPress={save} disabled={!valid || saving} />
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, paddingTop: screen.topForm, paddingBottom: 20, gap: 16 },
  labels: { flexDirection: 'row', gap: 8 },
  labelChip: { flex: 1, height: 44, borderRadius: theme.radius.sm, borderWidth: 1, borderColor: theme.colors.line, alignItems: 'center', justifyContent: 'center' },
  labelChipOn: { borderColor: theme.colors.primary, backgroundColor: theme.colors.orange50 },
});

export default AddressEditScreen;

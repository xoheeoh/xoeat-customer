import { useState } from 'react';
import { StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';

import type { RootStackParamList } from '@typ/navigation';
import { updateMe } from '@apis/customerApi';
import { isOk } from '@apis/client';
import { useSession } from '@contexts/SessionContext';
import { useDialog } from '@contexts/DialogContext';
import { loadingController } from '@utils/loadingController';
import { phone as fmtPhone } from '@utils/formatter';
import { BOTTOM_BTN_BOX_HEIGHT, BottomBtnBox, InfoBox, KeyboardAwareScrollView, ScreenWrapper, TextField } from '@components/common';
import { screen } from '@styles';

type Props = NativeStackScreenProps<RootStackParamList, 'ProfileEdit'>;
const PHONE_RULE = /^01[016789]-?\d{3,4}-?\d{4}$/;

/** 내 정보: 이름·휴대폰 (주문자 정보로 쓰인다) */
const ProfileEditScreen: React.FC<Props> = ({ navigation }) => {
  const { me, setMe } = useSession();
  const { alert } = useDialog();
  const [name, setName] = useState(me?.name ?? '');
  const [phone, setPhone] = useState(me?.phone ?? '');
  const [saving, setSaving] = useState(false);

  const valid = name.trim().length >= 2 && PHONE_RULE.test(phone.trim());
  const dirty = name.trim() !== me?.name || phone.trim() !== me?.phone;

  const save = async () => {
    if (!valid || !dirty || saving) return;
    setSaving(true);
    loadingController.start();
    const res = await updateMe({ name: name.trim(), phone: fmtPhone(phone.trim()) });
    loadingController.stop();
    setSaving(false);
    if (!isOk(res) || !res.me) {
      await alert({ title: '내 정보', message1: res.resultMsg });
      return;
    }
    setMe(res.me);
    Toast.show({ type: 'success', text1: '내 정보를 저장했어요' });
    navigation.goBack();
  };

  return (
    <ScreenWrapper backgroundColor="white" keyboardBottomInset={BOTTOM_BTN_BOX_HEIGHT}>
      <KeyboardAwareScrollView contentContainerStyle={styles.container} keyboardAccessoryHeight={BOTTOM_BTN_BOX_HEIGHT}>
        <TextField id="loginId" inputMode="text" label="아이디" placeholder="" value={me?.loginId ?? ''} onChangeText={() => {}} editable={false} />
        <TextField id="name" inputMode="text" label="이름" placeholder="주문자 이름" value={name} onChangeText={setName} maxLength={20} />
        <TextField id="phone" inputMode="tel" label="휴대폰 번호" placeholder="010-0000-0000" value={phone} onChangeText={setPhone} maxLength={13} error={phone.length > 0 && !PHONE_RULE.test(phone.trim())} />
        <InfoBox>이름과 휴대폰 번호는 주문할 때 가게에 전달돼요. 아이디는 바꿀 수 없어요.</InfoBox>
      </KeyboardAwareScrollView>
      <BottomBtnBox label="저장" onPress={save} disabled={!valid || !dirty || saving} />
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({ container: { paddingHorizontal: 20, paddingTop: screen.topForm, paddingBottom: 20, gap: 16 } });

export default ProfileEditScreen;

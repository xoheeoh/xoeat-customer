import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';

import type { RootStackParamList } from '@typ/navigation';
import { deleteMyAccount, updateMe } from '@apis/customerApi';
import { isOk } from '@apis/client';
import { useSession } from '@contexts/SessionContext';
import { useCart } from '@contexts/CartContext';
import { useDialog } from '@contexts/DialogContext';
import { loadingController } from '@utils/loadingController';
import { goToLogin } from '@utils/navigationHelpers';
import { phone as fmtPhone, phoneInput } from '@utils/formatter';
import { BOTTOM_BTN_BOX_HEIGHT, BottomBtnBox, InfoBox, KeyboardAwareScrollView, ScreenWrapper, TextField, Typography } from '@components/common';
import { screen } from '@styles';
import { DeleteAccountSheet } from './DeleteAccountSheet';

type Props = NativeStackScreenProps<RootStackParamList, 'ProfileEdit'>;
const PHONE_RULE = /^01[016789]-?\d{3,4}-?\d{4}$/;

/** 내 정보: 이름·휴대폰 (주문자 정보로 쓰인다). 맨 아래에 회원탈퇴 */
const ProfileEditScreen: React.FC<Props> = ({ navigation }) => {
  const { me, setMe } = useSession();
  const { clear: clearCart } = useCart();
  const { alert } = useDialog();
  const [name, setName] = useState(me?.name ?? '');
  const [phone, setPhone] = useState(me?.phone ?? '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  /** 회원탈퇴 실행. 실패하면 시트에 보여줄 문구를, 성공하면 null 을 돌려준다 */
  const deleteAccount = async (password: string): Promise<string | null> => {
    if (!me) return '로그인 정보를 찾을 수 없어요.';
    const res = await deleteMyAccount(me.loginId, password);
    if (!isOk(res)) return res.resultMsg;
    clearCart();
    setDeleting(false);
    Toast.show({ type: 'success', text1: '탈퇴가 완료됐어요', text2: '그동안 이용해 주셔서 감사합니다.' });
    goToLogin(navigation);
    return null;
  };

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
        <TextField id="phone" inputMode="tel" label="휴대폰 번호" placeholder="010-0000-0000" value={phone} onChangeText={(v) => setPhone(phoneInput(v))} maxLength={13} error={phone.length > 0 && !PHONE_RULE.test(phone.trim())} />
        <InfoBox>이름과 휴대폰 번호는 주문할 때 가게에 전달돼요. 아이디는 바꿀 수 없어요.</InfoBox>

        {/* 회원탈퇴: 눈에 덜 띄게 폼 맨 아래 작은 글자 버튼. 누르면 비밀번호 확인 시트 */}
        <View style={styles.withdrawWrap}>
          <Pressable onPress={() => setDeleting(true)} hitSlop={8} accessibilityRole="button">
            <Typography mode="caption1" color="gray400" style={styles.withdraw}>
              회원탈퇴
            </Typography>
          </Pressable>
        </View>
      </KeyboardAwareScrollView>
      <BottomBtnBox label="저장" onPress={save} disabled={!valid || !dirty || saving} />

      <DeleteAccountSheet visible={deleting} onClose={() => setDeleting(false)} onDelete={deleteAccount} />
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, paddingTop: screen.topForm, paddingBottom: 20, gap: 16 },
  withdrawWrap: { alignItems: 'center', marginTop: 24 },
  withdraw: { textDecorationLine: 'underline' },
});

export default ProfileEditScreen;

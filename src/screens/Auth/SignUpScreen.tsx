import { useState } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '@typ/navigation';
import { useDialog } from '@contexts/DialogContext';
import { login, signUp } from '@apis/customerApi';
import { isOk } from '@apis/client';
import { loadingController } from '@utils/loadingController';
import { goToMain } from '@utils/navigationHelpers';
import { phone as fmtPhone } from '@utils/formatter';
import { BOTTOM_BTN_BOX_HEIGHT, BottomBtnBox, CheckBox, KeyboardAwareScrollView, ScreenWrapper, TextField, Typography } from '@components/common';

type Props = NativeStackScreenProps<RootStackParamList, 'SignUp'>;

const ID_RULE = /^[a-z0-9]{4,20}$/;
const PHONE_RULE = /^01[016789]-?\d{3,4}-?\d{4}$/;

/** 회원가입: 아이디·비밀번호·이름·휴대폰 + 약관 동의. 가입 직후 자동 로그인 */
const SignUpScreen: React.FC<Props> = ({ navigation }) => {
  const { alert } = useDialog();
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const idOk = ID_RULE.test(loginId.trim().toLowerCase());
  const pwOk = password.length >= 8;
  const pw2Ok = password2.length > 0 && password === password2;
  const nameOk = name.trim().length >= 2;
  const phoneOk = PHONE_RULE.test(phone.trim());
  const valid = idOk && pwOk && pw2Ok && nameOk && phoneOk && agree;

  const submit = async () => {
    Keyboard.dismiss();
    if (!valid || submitting) return;
    setSubmitting(true);
    loadingController.start();
    const res = await signUp({ loginId, password, name, phone: fmtPhone(phone.trim()) });
    if (!isOk(res)) {
      loadingController.stop();
      setSubmitting(false);
      await alert({ title: '회원가입', message1: res.resultMsg });
      return;
    }
    // 데모는 이메일 확인이 꺼져 있어 바로 로그인된다. 세션이 없으면 한 번 더 로그인한다
    const l = await login(loginId, password);
    loadingController.stop();
    setSubmitting(false);
    if (!isOk(l)) {
      await alert({ title: '회원가입', message1: '가입은 됐지만 로그인에 실패했어요. 로그인 화면에서 다시 시도해 주세요.' });
      navigation.goBack();
      return;
    }
    await alert({ title: '가입 완료', message1: `${name.trim()}님, 환영해요!`, message2: '배송지와 결제수단을 등록하면 바로 주문할 수 있어요.' });
    goToMain(navigation);
  };

  return (
    <ScreenWrapper backgroundColor="white" keyboardBottomInset={BOTTOM_BTN_BOX_HEIGHT}>
      <KeyboardAwareScrollView contentContainerStyle={styles.container} keyboardAccessoryHeight={BOTTOM_BTN_BOX_HEIGHT}>
        <TextField
          id="loginId"
          inputMode="text"
          label="아이디"
          placeholder="영문 소문자·숫자 4~20자"
          value={loginId}
          onChangeText={(v) => setLoginId(v.toLowerCase())}
          maxLength={20}
          error={loginId.length > 0 && !idOk}
          descMessage={loginId.length > 0 && !idOk ? '영문 소문자와 숫자로 4~20자' : undefined}
        />
        <TextField
          id="password"
          inputMode="text"
          label="비밀번호"
          placeholder="8자 이상"
          value={password}
          onChangeText={setPassword}
          secure
          error={password.length > 0 && !pwOk}
          descMessage={password.length > 0 && !pwOk ? '8자 이상 입력해 주세요' : undefined}
        />
        <TextField
          id="password2"
          inputMode="text"
          label="비밀번호 확인"
          placeholder="비밀번호 다시 입력"
          value={password2}
          onChangeText={setPassword2}
          secure
          error={password2.length > 0 && !pw2Ok}
          descMessage={password2.length > 0 && !pw2Ok ? '비밀번호가 일치하지 않아요' : undefined}
        />
        <TextField id="name" inputMode="text" label="이름" placeholder="주문자 이름" value={name} onChangeText={setName} maxLength={20} />
        <TextField
          id="phone"
          inputMode="tel"
          label="휴대폰 번호"
          placeholder="010-0000-0000"
          value={phone}
          onChangeText={setPhone}
          maxLength={13}
          error={phone.length > 0 && !phoneOk}
          descMessage="주문 진행 상황을 안내받을 번호예요"
        />

        <View style={styles.terms}>
          <CheckBox
            isChecked={agree}
            setIsChecked={setAgree}
            labelComponent={
              <Typography mode="body2" color="gray700">
                서비스 이용약관과 개인정보 처리방침에 동의합니다 (데모)
              </Typography>
            }
          />
        </View>
      </KeyboardAwareScrollView>
      <BottomBtnBox label="가입하기" onPress={submit} disabled={!valid || submitting} />
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20, gap: 16 },
  terms: { marginTop: 8 },
});

export default SignUpScreen;

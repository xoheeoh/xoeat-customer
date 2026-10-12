import { useState } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '@typ/navigation';
import { useDialog } from '@contexts/DialogContext';
import { login, signUp } from '@apis/customerApi';
import { isOk } from '@apis/client';
import { loadingController } from '@utils/loadingController';
import { goToMain } from '@utils/navigationHelpers';
import { phone as fmtPhone, phoneInput } from '@utils/formatter';
import type { TermsKey } from '@dt/terms';
import { TermsSheet } from './TermsSheet';
import {
  BOTTOM_BTN_BOX_HEIGHT,
  BottomBtnBox,
  CheckBox,
  KeyboardAwareScrollView,
  ScreenWrapper,
  TextField,
  Typography,
} from '@components/common';
import { screen } from '@styles';

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
  /** 지금 보고 있는 약관. null 이면 시트 닫힘. 서비스 이용약관 → 개인정보 처리방침 순서로 넘어간다 */
  const [openTerms, setOpenTerms] = useState<TermsKey | null>(null);

  /** 체크박스를 눌렀을 때. 꺼져 있으면 약관부터 보여주고, 켜져 있으면 바로 끈다 */
  const onPressAgree = () => {
    if (agree) setAgree(false);
    else setOpenTerms('service');
  };
  /** 시트의 "동의하기". 1번 문서면 2번으로, 2번 문서면 체크를 켜고 닫는다 */
  const onAgreeTerms = () => {
    if (openTerms === 'service') {
      setOpenTerms('privacy');
    } else {
      setAgree(true);
      setOpenTerms(null);
    }
  };
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
    // 로그인 화면이 아이디·비밀번호를 trim 해서 보내므로 가입도 같은 값으로 보낸다. 다르면 가입 직후 로그인이 안 될 수 있다
    const id = loginId.trim();
    const pw = password.trim();
    const res = await signUp({ loginId: id, password: pw, name: name.trim(), phone: fmtPhone(phone.trim()) });
    if (!isOk(res)) {
      loadingController.stop();
      setSubmitting(false);
      await alert({ title: '회원가입', message1: res.resultMsg });
      return;
    }
    // 데모는 이메일 확인이 꺼져 있어 가입 직후 바로 로그인할 수 있다
    const l = await login(id, pw);
    loadingController.stop();
    setSubmitting(false);
    if (!isOk(l)) {
      await alert({
        title: '회원가입',
        message1: '가입은 됐지만 로그인에 실패했어요. 로그인 화면에서 다시 시도해 주세요.',
      });
      navigation.goBack();
      return;
    }
    await alert({
      title: '가입 완료',
      message1: `${name.trim()}님, 환영해요!`,
      message2: '배송지와 결제수단을 등록하면 바로 주문할 수 있어요.',
    });
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
        <TextField
          id="name"
          inputMode="text"
          label="이름"
          placeholder="주문자 이름"
          value={name}
          onChangeText={setName}
          maxLength={20}
        />
        <TextField
          id="phone"
          inputMode="tel"
          label="휴대폰 번호"
          placeholder="010-0000-0000"
          value={phone}
          // 카드번호처럼 치는 즉시 하이픈을 넣는다
          onChangeText={(v) => setPhone(phoneInput(v))}
          maxLength={13}
          error={phone.length > 0 && !phoneOk}
        />

        <View style={styles.terms}>
          {/* 체크박스를 켜려면 두 약관을 차례로 읽고 각각 동의해야 한다. 체크 상태는 시트의 마지막 "동의하기"에서만 켜진다 */}
          <CheckBox
            isChecked={agree}
            setIsChecked={onPressAgree}
            labelComponent={
              <Typography mode="body2" color="gray700">
                서비스 이용약관과 개인정보 처리방침에 동의합니다.
              </Typography>
            }
          />
        </View>
      </KeyboardAwareScrollView>
      <BottomBtnBox label="가입하기" onPress={submit} disabled={!valid || submitting} />

      <TermsSheet
        doc={openTerms}
        step={openTerms ? { index: openTerms === 'service' ? 1 : 2, total: 2 } : undefined}
        agreeLabel={openTerms === 'service' ? '동의하고 다음' : '동의하기'}
        onClose={() => setOpenTerms(null)}
        onAgree={onAgreeTerms}
      />
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, paddingTop: screen.topForm, paddingBottom: 20, gap: 16 },
  terms: { marginTop: 8 },
});

export default SignUpScreen;

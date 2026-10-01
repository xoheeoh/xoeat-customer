import { useEffect, useState } from 'react';
import { Image, Keyboard, StyleSheet, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '@typ/navigation';
import { useDialog } from '@contexts/DialogContext';
import { getData, storeData } from '@storages/asyncStorage';
import { login } from '@apis/customerApi';
import { isOk } from '@apis/client';
import { loadingController } from '@utils/loadingController';
import { goToMain } from '@utils/navigationHelpers';
import { CheckBox, InfoBox, KeyboardAwareScrollView, PrimaryButton, ScreenWrapper, TextButton, TextField, Typography } from '@components/common';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [saveId, setSaveId] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { alert } = useDialog();

  useEffect(() => {
    getData<string>('savedLoginId').then((v) => {
      if (v) {
        setLoginId(v);
        setSaveId(true);
      }
    });
  }, []);

  const handleLogin = async () => {
    Keyboard.dismiss();
    const id = loginId.trim();
    const pw = password.trim();
    if (!id || !pw) {
      await alert({ title: '로그인', message1: '아이디와 비밀번호를 입력해 주세요.' });
      return;
    }
    setSubmitting(true);
    loadingController.start();
    const res = await login(id, pw);
    loadingController.stop();
    setSubmitting(false);
    if (!isOk(res)) {
      await alert({ title: '로그인', message1: res.resultMsg });
      return;
    }
    await storeData('savedLoginId', saveId ? id : '');
    goToMain(navigation);
  };

  return (
    <ScreenWrapper hasHeader={false} backgroundColor="white">
      <KeyboardAwareScrollView contentContainerStyle={styles.container}>
        <View style={styles.brand}>
          <Image source={require('@images/icon.png')} style={styles.logo} />
          <Typography mode="heading2" color="gray900">
            Xoeat
          </Typography>
          <Typography mode="body2" color="gray500">
            오늘 뭐 먹지, 한 번에 주문.
          </Typography>
        </View>

        <View style={styles.form}>
          <TextField id="loginId" inputMode="text" label="아이디" placeholder="아이디" value={loginId} onChangeText={setLoginId} />
          <TextField id="password" inputMode="text" label="비밀번호" placeholder="비밀번호" value={password} onChangeText={setPassword} secure />
          <CheckBox
            isChecked={saveId}
            setIsChecked={setSaveId}
            labelComponent={
              <Typography mode="body2" color="gray700">
                아이디 저장
              </Typography>
            }
          />
          <PrimaryButton label="로그인" onPress={handleLogin} disabled={submitting} />
          <TextButton label="아직 회원이 아니라면 회원가입" onPress={() => navigation.navigate('SignUp')} size="md" />
        </View>

        <InfoBox icon="account-key-outline" style={{ marginTop: 24 }}>
          <Typography mode="caption1" color="gray600">
            데모 계정{'\n'}아이디 <Typography mode="subtitle4" color="gray900">user01</Typography> · 비밀번호{' '}
            <Typography mode="subtitle4" color="gray900">demo1234!</Typography>
            {'\n'}배송지와 카드가 등록되어 있어 바로 주문해 볼 수 있어요. 회원가입도 실제로 동작합니다.
          </Typography>
        </InfoBox>
      </KeyboardAwareScrollView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 72, paddingBottom: 40 },
  brand: { alignItems: 'center', gap: 6, marginBottom: 40 },
  logo: { width: 72, height: 72, borderRadius: 18, marginBottom: 10 },
  form: { gap: 16 },
});

export default LoginScreen;

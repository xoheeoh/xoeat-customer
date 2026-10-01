import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';

import type { RootStackParamList } from '@typ/navigation';
import { addPaymentMethod, setDefaultPaymentMethod } from '@apis/customerApi';
import { isOk } from '@apis/client';
import { useSession } from '@contexts/SessionContext';
import { useDialog } from '@contexts/DialogContext';
import { CARD_BRANDS } from '@dt/constants';
import { cardNumber as fmtCard, expiry as fmtExpiry, luhnValid } from '@utils/formatter';
import { loadingController } from '@utils/loadingController';
import { BOTTOM_BTN_BOX_HEIGHT, BottomBtnBox, CheckBox, InfoBox, KeyboardAwareScrollView, ScreenWrapper, TextField, Typography } from '@components/common';
import { theme } from '@styles';

type Props = NativeStackScreenProps<RootStackParamList, 'PaymentMethodAdd'>;

/** 가상 카드 등록: 카드사 · 카드번호(Luhn) · 유효기간 · 별칭. 번호는 끝 4자리만 서버에 간다 */
const PaymentMethodAddScreen: React.FC<Props> = ({ navigation }) => {
  const { me } = useSession();
  const { alert } = useDialog();
  const [brand, setBrand] = useState(CARD_BRANDS[0]);
  const [number, setNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [alias, setAlias] = useState('');
  const [makeDefault, setMakeDefault] = useState(true);
  const [saving, setSaving] = useState(false);

  const digits = number.replace(/\D/g, '');
  const numberOk = digits.length === 16 && luhnValid(digits);
  const expiryOk = (() => {
    const m = /^(\d{2})\/(\d{2})$/.exec(expiry);
    if (!m) return false;
    const mm = Number(m[1]);
    const yy = Number(m[2]);
    if (mm < 1 || mm > 12) return false;
    const now = new Date();
    return yy * 100 + mm >= (now.getFullYear() % 100) * 100 + now.getMonth() + 1;
  })();
  const valid = numberOk && expiryOk;

  const save = async () => {
    if (!me || !valid || saving) return;
    setSaving(true);
    loadingController.start();
    const res = await addPaymentMethod({ brand, cardNumber: digits, expiry, alias }, me.id);
    if (isOk(res) && res.method && makeDefault) await setDefaultPaymentMethod(res.method.id);
    loadingController.stop();
    setSaving(false);
    if (!isOk(res)) {
      await alert({ title: '카드 등록', message1: res.resultMsg });
      return;
    }
    Toast.show({ type: 'success', text1: `${brand}카드 **** ${digits.slice(-4)} 등록 완료` });
    navigation.goBack();
  };

  return (
    <ScreenWrapper backgroundColor="white" keyboardBottomInset={BOTTOM_BTN_BOX_HEIGHT}>
      <KeyboardAwareScrollView contentContainerStyle={styles.container} keyboardAccessoryHeight={BOTTOM_BTN_BOX_HEIGHT}>
        {/* 카드 미리보기 */}
        <View style={styles.preview}>
          <Typography mode="subtitle3" color="white">
            {brand}카드
          </Typography>
          <Typography mode="heading3" color="white" style={{ letterSpacing: 2 }}>
            {(digits + '••••••••••••••••').slice(0, 16).match(/.{1,4}/g)!.join(' ')}
          </Typography>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Typography mode="caption1" color="orange100">
              {alias || 'Xoeat Pay'}
            </Typography>
            <Typography mode="caption1" color="orange100">
              {expiry || 'MM/YY'}
            </Typography>
          </View>
        </View>

        <View>
          <Typography mode="subtitle3" color="gray700" style={{ marginBottom: 8 }}>
            카드사
          </Typography>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {CARD_BRANDS.map((b) => (
              <Pressable key={b} onPress={() => setBrand(b)} style={[styles.brand, brand === b && styles.brandOn]}>
                <Typography mode="subtitle3" color={brand === b ? 'orange700' : 'gray600'}>
                  {b}
                </Typography>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <TextField
          id="cardNumber"
          inputMode="numeric"
          label="카드번호"
          placeholder="0000 0000 0000 0000"
          value={number}
          onChangeText={(v) => setNumber(fmtCard(v))}
          maxLength={19}
          error={digits.length === 16 && !numberOk}
          descMessage={digits.length === 16 && !numberOk ? '카드번호를 확인해 주세요 (체크섬 불일치)' : '테스트용: 4242 4242 4242 4242'}
        />
        <TextField
          id="expiry"
          inputMode="numeric"
          label="유효기간"
          placeholder="MM/YY"
          value={expiry}
          onChangeText={(v) => setExpiry(fmtExpiry(v))}
          maxLength={5}
          error={expiry.length === 5 && !expiryOk}
          descMessage={expiry.length === 5 && !expiryOk ? '유효기간을 확인해 주세요' : undefined}
        />
        <TextField id="alias" inputMode="text" label="별칭 (선택)" placeholder="예) 생활비 카드" value={alias} onChangeText={setAlias} maxLength={20} />
        <CheckBox
          isChecked={makeDefault}
          setIsChecked={setMakeDefault}
          labelComponent={
            <Typography mode="body2" color="gray700">
              기본 결제수단으로 설정
            </Typography>
          }
        />
        <InfoBox icon="shield-check-outline">실제 PG 연동 자리예요. 데모에서는 카드번호 형식(Luhn)만 검사하고 끝 4자리와 유효기간만 저장해요. CVC·비밀번호는 받지 않아요.</InfoBox>
      </KeyboardAwareScrollView>
      <BottomBtnBox label="카드 등록" onPress={save} disabled={!valid || saving} />
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20, gap: 16 },
  preview: { backgroundColor: theme.colors.gray900, borderRadius: theme.radius.lg, padding: 20, gap: 14, aspectRatio: 1.7, justifyContent: 'space-between' },
  brand: { paddingHorizontal: 14, height: 36, borderRadius: theme.radius.pill, borderWidth: 1, borderColor: theme.colors.line, alignItems: 'center', justifyContent: 'center' },
  brandOn: { borderColor: theme.colors.primary, backgroundColor: theme.colors.orange50 },
});

export default PaymentMethodAddScreen;

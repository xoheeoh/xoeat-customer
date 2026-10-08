import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BottomSheet, InfoBox, PrimaryButton, TextField, Typography } from '@components/common';
import { theme } from '@styles';

interface DeleteAccountSheetProps {
  visible: boolean;
  onClose: () => void;
  /** 비밀번호를 받아 탈퇴를 실행한다. 실패 문구를 돌려주면 시트가 입력칸 아래에 보여준다. 성공하면 null */
  onDelete: (password: string) => Promise<string | null>;
}

/**
 * 회원탈퇴 확인 바텀시트. 지워지는 내용을 안내하고, 비밀번호를 다시 입력받아야 "탈퇴하기"가 눌린다.
 * 틀린 비밀번호·진행 중 주문 같은 거절 사유는 입력칸 아래 빨간 글씨로 보여준다.
 */
const DeleteAccountSheet: React.FC<DeleteAccountSheetProps> = ({ visible, onClose, onDelete }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const close = () => {
    setPassword('');
    setError(null);
    onClose();
  };

  const submit = async () => {
    if (!password || busy) return;
    setBusy(true);
    const msg = await onDelete(password);
    setBusy(false);
    if (msg) setError(msg);
  };

  return (
    <BottomSheet
      visible={visible}
      setVisible={(v) => {
        if (!v) close();
      }}
      title="회원탈퇴"
      content={
        <View style={styles.body}>
          <Typography mode="body2" color="gray700">
            탈퇴하면 배송지·결제수단·찜한 가게 정보가 모두 삭제되고 복구할 수 없어요. 주문 기록은 가게 정산을 위해 남지만 내 정보와의 연결은 끊겨요.
          </Typography>
          <InfoBox icon="alert-circle-outline">진행 중인 주문이 있으면 주문이 끝난 뒤에 탈퇴할 수 있어요.</InfoBox>
          <TextField
            id="deletePassword"
            inputMode="text"
            secure
            label="비밀번호 확인"
            placeholder="본인 확인을 위해 비밀번호를 입력해 주세요"
            value={password}
            onChangeText={(v) => {
              setPassword(v);
              if (error) setError(null);
            }}
            error={!!error}
            descMessage={error ?? undefined}
          />
          {/* 되돌릴 수 없는 동작이라 빨간 버튼 */}
          <PrimaryButton label={busy ? '탈퇴 처리 중…' : '탈퇴하기'} onPress={submit} disabled={!password || busy} buttonColor={theme.colors.red600} />
        </View>
      }
    />
  );
};

const styles = StyleSheet.create({
  body: { gap: 16 },
});

export default DeleteAccountSheet;
export { DeleteAccountSheet };

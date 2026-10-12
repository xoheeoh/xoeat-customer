import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';

import type { TermsKey } from '@dt/terms';
import { TERMS } from '@dt/terms';
import { BottomSheet, PrimaryButton, Typography } from '@components/common';
import { theme } from '@styles';

interface TermsSheetProps {
  /** 열 문서. null 이면 닫혀 있다 */
  doc: TermsKey | null;
  /** X·바깥 눌러 닫기. 동의하지 않은 것으로 본다 */
  onClose: () => void;
  /** 아래 버튼을 눌렀을 때. 다음 문서로 넘길지 닫을지는 회원가입 화면이 정한다 */
  onAgree: () => void;
  /** 아래 버튼 글자. 기본 "동의하기" */
  agreeLabel?: string;
  /** "1 / 2" 처럼 몇 번째 문서인지. 두 약관을 차례로 보여줄 때 쓴다 */
  step?: { index: number; total: number };
}

/**
 * 약관 보기 바텀시트. 회원가입의 동의 체크박스를 누르면 서비스 이용약관 → 개인정보 처리방침 순으로 열린다.
 * 내용은 시트 안에서 스크롤하고, 아래 버튼을 눌러야 다음으로 넘어간다. 두 문서를 모두 동의해야 체크박스가 켜진다.
 */
const TermsSheet: React.FC<TermsSheetProps> = ({ doc, onClose, onAgree, agreeLabel = '동의하기', step }) => {
  const terms = doc ? TERMS[doc] : null;
  // 창 크기가 바뀌어도(웹 창 조절·회전) 따라가도록 훅으로 읽는다
  const { height: windowHeight } = useWindowDimensions();
  return (
    <BottomSheet
      visible={!!doc}
      setVisible={(v) => {
        if (!v) onClose();
      }}
      title={terms ? (step ? `${terms.title}  (${step.index}/${step.total})` : terms.title) : ''}
      content={
        terms ? (
          // key: 문서가 바뀌면(1→2) 스크롤 위치가 맨 위로 돌아가도록 내용을 새로 만든다
          <View key={terms.key} style={styles.body}>
            {/* 약관이 길어도 시트가 화면을 다 덮지 않게 절반 남짓에서 스크롤 */}
            <ScrollView style={{ maxHeight: windowHeight * 0.55 }} showsVerticalScrollIndicator={false}>
              <View style={styles.summary}>
                <Typography mode="body2" color="gray700">
                  {terms.summary}
                </Typography>
              </View>
              {terms.sections.map((s) => (
                <View key={s.heading} style={styles.section}>
                  <Typography mode="subtitle3" color="gray900">
                    {s.heading}
                  </Typography>
                  <Typography mode="body2" color="gray700">
                    {s.body}
                  </Typography>
                </View>
              ))}
            </ScrollView>
            <PrimaryButton label={agreeLabel} onPress={onAgree} />
          </View>
        ) : null
      }
    />
  );
};

const styles = StyleSheet.create({
  body: { gap: 16 },
  summary: { backgroundColor: theme.colors.gray50, borderRadius: theme.radius.md, padding: 14, marginBottom: 16 },
  section: { gap: 6, marginBottom: 18 },
});

export default TermsSheet;
export { TermsSheet };

import { InputModeOptions, StyleSheet, TextInput, View } from 'react-native';
import { Icon } from 'react-native-paper';
import { theme } from '@styles';
import AnimatedTextInput from './AnimatedTextInput';
import Typography from './Typography';

interface TextFieldProps {
  id: string;
  inputMode: InputModeOptions;
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  error?: boolean;
  descMessage?: string;
  secure?: boolean;
  disabled?: boolean;
  maxLength?: number;
  editable?: boolean;
  inputRef?: React.RefObject<TextInput | null>;
  onFocus?: () => void;
}

/** 라벨이 떠 있는 입력칸 + 아래 안내·오류 문구 */
const TextField: React.FC<TextFieldProps> = ({ id, inputMode = 'text', label, value, onChangeText, placeholder, error, descMessage, secure = false, disabled, maxLength, editable, inputRef, onFocus }) => {
  return (
    <View>
      <AnimatedTextInput
        ref={inputRef}
        id={id}
        inputMode={inputMode}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.gray300}
        value={value}
        setValue={onChangeText}
        secureTextEntry={secure}
        label={label}
        error={error}
        disabled={disabled}
        maxLength={maxLength}
        editable={editable}
        onFocus={() => onFocus?.()}
      />

      {/* 보여줘야 하는 오류 or 안내 메시지가 있는 경우 */}
      {descMessage && (
        <View style={styles.alertMsg}>
          {error && <Icon source="alert-circle" size={20} color={theme.colors.red500} />}
          <Typography mode="caption1" color={error ? 'red500' : 'gray600'}>
            {descMessage}
          </Typography>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  alertMsg: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    marginHorizontal: 2,
    marginBottom: 2,
  },
});

export default TextField;
export { TextField };

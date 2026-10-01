/** `@env` 별칭으로 내보내는 환경변수. Expo 는 EXPO_PUBLIC_ 접두어 변수를 빌드 시 인라인한다 */
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
/** 개발 중 특정 화면으로 바로 시작 (배포 빌드에서는 항상 빈 값) */
export const DEV_START_SCREEN = __DEV__ ? (process.env.EXPO_PUBLIC_DEV_START_SCREEN ?? '') : '';

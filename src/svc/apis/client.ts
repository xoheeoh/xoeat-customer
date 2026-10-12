/**
 * Supabase 클라이언트와 API 어댑터 공통 헬퍼.
 *
 * 화면 코드는 { resultCd, resultMsg, ...data } 형태의 응답만 본다.
 * 어댑터(catalogApi / customerApi / orderApi)가 Supabase 호출 결과를 그 모양으로 바꿔 돌려준다.
 * 서버가 바뀌어도 고칠 곳은 어댑터뿐이다.
 */
import 'react-native-url-polyfill/auto';
import { AppState, Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@env';
import { secureStorage } from '@storages/asyncStorage';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY 가 설정되지 않았습니다. 프로젝트 루트의 .env 확인 (.env.example 참고)');
}

// 값이 비어 있어도 앱은 뜨게 두고(로그인 시 NETWORK 오류로 안내), createClient 가 throw 하지 않도록 자리표시자를 넣는다
export const supabase = createClient(SUPABASE_URL || 'http://localhost:54321', SUPABASE_ANON_KEY || 'missing-anon-key', {
  auth: {
    storage: secureStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

/** 아이디 → 로그인 이메일. 사장님 앱(@demo.xoeat.app)과 도메인이 달라 같은 아이디를 써도 충돌하지 않는다 (사장님 앱 저장소의 scripts/seed-demo.mjs 와 같은 규칙) */
export const emailFor = (loginId: string) => `${loginId.trim().toLowerCase()}@customer.xoeat.app`;

export const hasSession = async () => !!(await supabase.auth.getSession()).data.session;

/* ── 응답 모양 ─────────────────────────────────────────────────── */
export type ApiResult<T = object> = { resultCd: string; resultMsg: string } & Partial<T>;

const ok = <T extends object>(data?: T): ApiResult<T> =>
  ({ resultCd: '0000', resultMsg: '정상 처리되었습니다.', ...(data ?? ({} as T)) }) as ApiResult<T>;

export const isOk = (r: ApiResult<unknown>) => r.resultCd === '0000';

/** 서버 오류 코드 → 화면 문구 */
const MESSAGES: Record<string, string> = {
  UNAUTHENTICATED: '로그인이 필요합니다.',
  NOT_A_CUSTOMER: '구매자 계정으로 로그인해 주세요.',
  STORE_NOT_FOUND: '가게를 찾을 수 없습니다.',
  STORE_PAUSED: '지금은 주문을 받지 않는 가게예요. 잠시 후 다시 시도해 주세요.',
  DELIVERY_NOT_AVAILABLE: '이 가게는 지금 배달 주문을 받지 않아요. 포장으로 주문해 보세요.',
  PICKUP_NOT_AVAILABLE: '이 가게는 지금 포장 주문을 받지 않아요.',
  ADDRESS_REQUIRED: '배달 주소를 선택해 주세요.',
  PAYMENT_METHOD_REQUIRED: '결제수단을 선택해 주세요.',
  CART_EMPTY: '장바구니가 비어 있어요.',
  MENU_NOT_FOUND: '판매가 종료된 메뉴가 있어요. 장바구니를 확인해 주세요.',
  MENU_SOLD_OUT: '품절된 메뉴가 있어요. 장바구니를 확인해 주세요.',
  INVALID_QUANTITY: '수량을 확인해 주세요.',
  INVALID_OPTION: '선택한 옵션이 더 이상 유효하지 않아요. 메뉴를 다시 담아 주세요.',
  OPTION_REQUIRED: '필수 옵션을 선택해 주세요.',
  OPTION_TOO_MANY: '옵션 선택 개수를 초과했어요.',
  MIN_ORDER_AMOUNT: '최소 주문금액을 채워 주세요.',
  ORDER_NOT_FOUND: '주문을 찾을 수 없습니다.',
  ACTIVE_ORDER_EXISTS: '진행 중인 주문이 있어 지금은 탈퇴할 수 없어요. 주문이 끝난 뒤 다시 시도해 주세요.',
  PASSWORD_MISMATCH: '비밀번호가 맞지 않아요.',
  INVALID_TRANSITION: '이미 가게에서 접수한 주문이라 취소할 수 없어요. 가게에 직접 문의해 주세요.',
  invalid_credentials: '아이디 또는 비밀번호가 올바르지 않습니다.',
  'Invalid login credentials': '아이디 또는 비밀번호가 올바르지 않습니다.',
  user_already_exists: '이미 사용 중인 아이디입니다.',
  'User already registered': '이미 사용 중인 아이디입니다.',
  weak_password: '비밀번호는 8자 이상으로 설정해 주세요.',
  NETWORK: '네트워크 연결을 확인해 주세요.',
  '23505': '이미 등록된 항목입니다.',
  '23514': '입력값을 확인해 주세요.',
};

const fail = (code: string, msg?: string): ApiResult =>
  ({
    resultCd: code || '9999',
    resultMsg: msg ?? MESSAGES[code] ?? '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.',
  }) as ApiResult;

/** supabase { data, error } → 값. 실패는 throw. */
export function unwrap<T>(res: { data: T | null; error: { message: string; code?: string } | null }): T {
  if (res.error) {
    const e = new Error(res.error.message) as Error & { code?: string };
    const isAuthError = res.error.code === 'PGRST301' || /jwt/i.test(res.error.message);
    e.code = isAuthError
      ? 'UNAUTHENTICATED'
      : res.error.code && MESSAGES[res.error.code]
        ? res.error.code
        : res.error.message;
    throw e;
  }
  return res.data as T;
}

/** throw 된 오류 → ApiResult */
const toFail = (e: unknown): ApiResult => {
  const err = e as { code?: string; message?: string };
  if (err?.message && /fetch|network/i.test(err.message)) return fail('NETWORK');
  const code = err?.code ?? err?.message ?? '9999';
  return fail(code);
};

/** 어댑터 본문을 감싸 try/catch 를 한 곳에 둔다 */
export async function run<T extends object>(body: () => Promise<T>): Promise<ApiResult<T>> {
  try {
    return ok(await body());
  } catch (e) {
    return toFail(e);
  }
}

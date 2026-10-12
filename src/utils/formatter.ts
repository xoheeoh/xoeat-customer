/** 숫자 → "12,000원" */
export const won = (n: number | null | undefined) => `${(n ?? 0).toLocaleString('ko-KR')}원`;

/** "01012345678" → "010-1234-5678" (이미 하이픈이 있으면 그대로) */
export const phone = (s: string) => {
  if (!s) return '';
  if (s.includes('-')) return s;
  const d = s.replace(/\D/g, '');
  if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  if (d.length === 10) return d.startsWith('02') ? `${d.slice(0, 2)}-${d.slice(2, 6)}-${d.slice(6)}` : `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  return s;
};

const pad = (n: number) => String(n).padStart(2, '0');
const DAY_KO = ['일', '월', '화', '수', '목', '금', '토'];

/** ISO → "10월 1일 (목) 14:05" */
export const dateTime = (iso: string | null | undefined) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${DAY_KO[d.getDay()]}) ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** ISO → "14:05" */
export const timeOnly = (iso: string | null | undefined) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** "HH:mm" → "오전 10:00" */
export const timeKo = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  const ampm = h < 12 ? '오전' : '오후';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${ampm} ${hh}:${pad(m)}`;
};

/** 휴대폰 번호 형식 검사 (하이픈은 있어도 없어도 된다). 회원가입·내 정보 수정이 같이 쓴다 */
export const PHONE_RULE = /^01[016789]-?\d{3,4}-?\d{4}$/;

/**
 * 휴대폰 번호 입력 → 치는 즉시 하이픈. "010" → "010-1234" → "010-123-4567"(10자리) → "010-1234-5678"(11자리).
 * 숫자만 남기고 11자리까지만 받는다. 하이픈을 직접 쳐도 중복되지 않는다. 위의 phone() 은 완성된 번호 표시용, 이건 입력 중 표시용.
 */
export const phoneInput = (s: string) => {
  const d = s.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 7) return `${d.slice(0, 3)}-${d.slice(3)}`;
  if (d.length <= 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
};

/** 카드번호 입력 → "1234 5678 9012 3456" */
export const cardNumber = (s: string) => s.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ');

/** 유효기간 입력 → "MM/YY" */
export const expiry = (s: string) => {
  const d = s.replace(/\D/g, '').slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
};

/** Luhn 검사 (가상 카드도 형식은 지킨다) */
export const luhnValid = (s: string) => {
  const d = s.replace(/\D/g, '');
  if (d.length < 15) return false;
  let sum = 0;
  let dbl = false;
  for (let i = d.length - 1; i >= 0; i--) {
    let n = Number(d[i]);
    if (dbl) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    dbl = !dbl;
  }
  return sum % 10 === 0;
};

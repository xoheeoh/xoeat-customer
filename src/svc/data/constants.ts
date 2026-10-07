import type { OrderStatus, OrderType } from '@typ/domain';
import type { BadgeTone } from '@components/common/Badge';

/** 홈 카테고리 (아이콘은 MaterialCommunityIcons) */
export const CATEGORIES: { code: string; label: string; icon: string }[] = [
  { code: 'ALL', label: '전체', icon: 'silverware-fork-knife' },
  { code: 'KOREAN_FOOD', label: '한식', icon: 'rice' },
  { code: 'CHICKEN', label: '치킨', icon: 'food-drumstick' },
  { code: 'PIZZA', label: '피자', icon: 'pizza' },
  { code: 'BURGER', label: '버거', icon: 'hamburger' },
  { code: 'SNACK_BAR', label: '분식', icon: 'noodles' },
  { code: 'CHINESE_FOOD', label: '중식', icon: 'bowl-mix' },
  { code: 'JAPANESE_FOOD', label: '일식', icon: 'fish' },
  { code: 'WESTERN_FOOD', label: '양식', icon: 'pasta' },
  { code: 'CAFE_DESSERT', label: '카페', icon: 'coffee' },
  { code: 'NIGHT_FOOD', label: '야식', icon: 'weather-night' },
  { code: 'STEW', label: '찜·탕', icon: 'pot-steam' },
];
export const categoryLabel = (code: string) => CATEGORIES.find((c) => c.code === code)?.label ?? code;

/** 주문 상태 표시 (구매자 관점 문구) */
export const ORDER_STATUS: Record<OrderStatus, { label: string; tone: BadgeTone; desc: string }> = {
  PENDING: { label: '접수 대기', tone: 'orange', desc: '가게에서 주문을 확인하고 있어요' },
  ACCEPTED: { label: '조리중', tone: 'blue', desc: '가게에서 음식을 준비하고 있어요' },
  READY: { label: '픽업 가능', tone: 'green', desc: '포장이 완료됐어요. 가게에서 받아 가세요' },
  DELIVERING: { label: '배달중', tone: 'purple', desc: '배달 기사가 음식을 가지고 이동 중이에요' },
  COMPLETED: { label: '완료', tone: 'gray', desc: '맛있게 드세요!' },
  REJECTED: { label: '주문 거절', tone: 'red', desc: '가게 사정으로 주문이 거절됐어요. 결제는 자동 취소돼요' },
  CANCELED: { label: '주문 취소', tone: 'red', desc: '주문이 취소됐어요. 결제는 자동 취소돼요' },
};

export const ORDER_TYPE: Record<OrderType, { label: string; tone: BadgeTone }> = {
  DELIVERY: { label: '배달', tone: 'orange' },
  PICKUP: { label: '포장', tone: 'gray' },
};

export const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];

/** 결제수단 카드사 */
export const CARD_BRANDS = ['신한', '국민', '현대', '삼성', '롯데', '우리', '하나', 'NH농협'];

/** 카드사별 카드 색 (가상 카드 그림). 카드 등록 미리보기와 결제수단 목록이 같이 쓴다 */
export const CARD_BRAND_COLORS: Record<string, string> = {
  신한: '#1B4DB1',
  국민: '#5A4634',
  현대: '#1C1C1C',
  삼성: '#1E3A8A',
  롯데: '#C8102E',
  우리: '#0A6FB7',
  하나: '#0B8A6E',
  NH농협: '#0A7D45',
};

/** 목록에 없는 카드사일 때 쓰는 색 (theme.colors.gray700 과 같은 진회색) */
export const CARD_BRAND_FALLBACK_COLOR = '#3D3835';

/** 카드사 이름으로 카드 색을 찾는다 */
export const cardBrandColor = (brand: string) => CARD_BRAND_COLORS[brand] ?? CARD_BRAND_FALLBACK_COLOR;

export const REQUEST_PRESETS = ['문 앞에 놓아주세요', '벨 누르지 말아주세요', '수저·포크는 빼주세요', '도착하면 전화 주세요'];

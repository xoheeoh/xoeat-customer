import colors from './colors';

/** 모서리 반경 */
export const radius = { xs: 6, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, pill: 999 } as const;

/**
 * 화면 내용의 위·아래 바깥 여백.
 * 헤더(높이 56)는 제목 아래에 이미 빈 공간을 갖고 있고, 아래쪽은 안전 영역(제스처 막대·홈 인디케이터)이 빈 공간으로 보이므로 크게 띄우지 않는다.
 */
export const screen = {
  /** 첫 내용이 글자·입력칸인 폼 화면 */
  topForm: 16,
  /** 첫 내용이 카드인 화면. 헤더 아래 빈 공간과 카드 안쪽 여백이 숨 쉴 공간을 대신하므로 더하지 않는다 (홈 화면과 같은 간격) */
  topCard: 0,
  /** 화면 맨 위에 꽉 차게 놓이는 대표 이미지 높이 (가게 상세·메뉴 상세). 두 화면이 같은 값을 써야 오가며 볼 때 어색하지 않다 */
  heroImage: 220,
} as const;

/** 그림자 - RN 0.76+ / web 공통 boxShadow 문자열 */
export const shadow = {
  card: '0 1px 2px rgba(21, 23, 29, 0.04), 0 6px 20px rgba(21, 23, 29, 0.06)',
  float: '0 8px 28px rgba(21, 23, 29, 0.12)',
  /** 화면 아래에 붙는 바(하단 탭바 등). 위쪽으로 퍼져 내용과 구분선 없이 나뉘게 한다 */
  bar: '0 -2px 12px rgba(21, 23, 29, 0.06)',
  /** 메인색 동그라미 아이콘(주문 완료 체크, 주문 상세 현재 단계) 아래 은은한 주황 그림자. 짙으면 붉은 번짐처럼 보여 거리·퍼짐·진하기를 낮췄다 */
  primary: '0 4px 12px rgba(240, 80, 30, 0.16)',
} as const;

export const theme = {
  colors,
  radius,
  shadow,
  screen,
};

export default theme;

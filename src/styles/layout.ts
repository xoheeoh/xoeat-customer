/**
 * 여러 화면이 똑같이 쓰는 줄 배치. 다른 속성과 합쳐 쓸 수 있도록 StyleSheet 가 아닌 평범한 객체로 둔다.
 * 예) row: { ...rowBaseline, gap: 12 }
 */

/** 양 끝 정렬, 세로 가운데. 제목 줄 옆에 버튼·아이콘을 둘 때 */
export const rowBetween = { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' } as const;

/** 양 끝 정렬, 글자 밑줄 기준. 왼쪽 라벨과 오른쪽 금액처럼 글자끼리 나란히 둘 때 (크기가 달라도 밑줄이 맞는다) */
export const rowBaseline = { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' } as const;

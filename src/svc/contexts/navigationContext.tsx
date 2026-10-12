import type { RootStackParamList } from '@typ/navigation';
import React from 'react';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';

const navigationRef = React.createRef<NavigationContainerRef<RootStackParamList>>();

// 웹 브라우저 탭 제목. 기본값은 화면 이름으로 바뀌므로 하나로 고정한다. 네이티브에서는 무시된다.
const WEB_DOCUMENT_TITLE = 'Xoeat | 오늘 뭐 먹지, 간편하게 주문.';

// Provider 설정
export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <NavigationContainer ref={navigationRef} documentTitle={{ formatter: () => WEB_DOCUMENT_TITLE }}>
      {children}
    </NavigationContainer>
  );
};

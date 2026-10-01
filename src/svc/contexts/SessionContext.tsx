import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { getFavoriteIds, getMe } from '@apis/customerApi';
import { isOk } from '@apis/client';
import type { Customer } from '@typ/domain';

type SessionContextType = {
  /** 로그인한 회원. 로딩 전·로그아웃 상태는 null */
  me: Customer | null;
  setMe: (me: Customer | null) => void;
  refresh: () => Promise<void>;
  /** 찜한 가게 id. 목록·상세가 공유한다 */
  favoriteIds: string[];
  setFavoriteIds: (ids: string[]) => void;
};

const SessionContext = createContext<SessionContextType | null>(null);

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession 은 <SessionProvider> 안에서 사용해야 합니다.');
  return ctx;
}

export function SessionProvider({ children, enabled }: { children: React.ReactNode; enabled: boolean }) {
  const [me, setMe] = useState<Customer | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  const refresh = useCallback(async () => {
    const [m, f] = await Promise.all([getMe(), getFavoriteIds()]);
    setMe(isOk(m) && m.me ? m.me : null);
    setFavoriteIds(isOk(f) && f.storeIds ? f.storeIds : []);
  }, []);

  useEffect(() => {
    if (enabled) refresh();
    else {
      setMe(null);
      setFavoriteIds([]);
    }
  }, [enabled, refresh]);

  const value = useMemo<SessionContextType>(() => ({ me, setMe, refresh, favoriteIds, setFavoriteIds }), [me, refresh, favoriteIds]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { getData, storeData } from '@storages/asyncStorage';
import type { Cart, CartItem } from '@typ/domain';

type CartContextType = {
  cart: Cart | null;
  /** 상품 수량 합계 (탭 배지) */
  count: number;
  /** 상품 금액 합 */
  itemsAmount: number;
  /** 담기. 다른 가게 상품이 있으면 false 를 돌려주고 담지 않는다 (화면이 교체 여부를 묻는다) */
  add: (store: { id: string; name: string }, item: CartItem, replace?: boolean) => boolean;
  setQuantity: (key: string, quantity: number) => void;
  /** 담긴 항목의 옵션·수량을 바꾼다 (key 가 바뀜). 바꾼 결과가 이미 담긴 다른 항목과 같은 조합이면 그쪽에 수량을 합친다 */
  replace: (key: string, item: CartItem) => void;
  remove: (key: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextType | null>(null);
const STORAGE_KEY = 'cart';

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart 는 <CartProvider> 안에서 사용해야 합니다.');
  return ctx;
}

/** 장바구니는 기기에 저장한다 (한 번에 한 가게만). 주문이 완료되면 비운다 */
export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getData<Cart>(STORAGE_KEY).then((c) => {
      if (c?.items?.length) setCart(c);
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (loaded) storeData(STORAGE_KEY, cart);
  }, [cart, loaded]);

  const add = useCallback<CartContextType['add']>(
    (store, item, replace = false) => {
      let ok = true;
      setCart((prev) => {
        if (prev && prev.storeId !== store.id && !replace) {
          ok = false;
          return prev;
        }
        const base = prev && prev.storeId === store.id ? prev : { storeId: store.id, storeName: store.name, items: [] as CartItem[] };
        const exist = base.items.find((i) => i.key === item.key);
        const items = exist
          ? base.items.map((i) => (i.key === item.key ? { ...i, quantity: Math.min(99, i.quantity + item.quantity) } : i))
          : [...base.items, item];
        return { ...base, items };
      });
      return ok;
    },
    [],
  );

  const setQuantity = useCallback((key: string, quantity: number) => {
    setCart((prev) => {
      if (!prev) return prev;
      const items = prev.items.map((i) => (i.key === key ? { ...i, quantity: Math.max(1, Math.min(99, quantity)) } : i));
      return { ...prev, items };
    });
  }, []);

  const replace = useCallback((key: string, item: CartItem) => {
    setCart((prev) => {
      if (!prev) return prev;
      const duplicate = prev.items.find((i) => i.key !== key && i.key === item.key);
      const items = duplicate
        ? prev.items.filter((i) => i.key !== key).map((i) => (i.key === item.key ? { ...i, quantity: Math.min(99, i.quantity + item.quantity) } : i))
        : prev.items.map((i) => (i.key === key ? item : i)); // 같은 자리에 그대로 둔다
      return { ...prev, items };
    });
  }, []);

  const remove = useCallback((key: string) => {
    setCart((prev) => {
      if (!prev) return prev;
      const items = prev.items.filter((i) => i.key !== key);
      return items.length ? { ...prev, items } : null;
    });
  }, []);

  const clear = useCallback(() => setCart(null), []);

  const count = useMemo(() => cart?.items.reduce((s, i) => s + i.quantity, 0) ?? 0, [cart]);
  const itemsAmount = useMemo(() => cart?.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0) ?? 0, [cart]);

  const value = useMemo<CartContextType>(
    () => ({ cart, count, itemsAmount, add, setQuantity, replace, remove, clear }),
    [cart, count, itemsAmount, add, setQuantity, replace, remove, clear],
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

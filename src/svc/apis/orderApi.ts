/**
 * 주문 어댑터. 생성·취소는 RPC, 조회는 PostgREST, 상태 변경 알림은 Realtime.
 */
import { run, supabase, unwrap } from './client';
import type { Cart, Order, OrderStatus, OrderType } from '@typ/domain';

type ItemRow = { id: string; menu_id: string | null; menu_name: string; quantity: number; unit_price: number; options: Order['items'][number]['options']; line_amount: number };
export type OrderRow = {
  id: string;
  order_no: string;
  store_id: string;
  order_type: OrderType;
  status: OrderStatus;
  address: string | null;
  address_detail: string | null;
  request_memo: string;
  items_amount: number;
  delivery_fee: number;
  total_amount: number;
  card_label: string | null;
  cooking_minutes: number | null;
  reject_reason: string | null;
  accepted_at: string | null;
  completed_at: string | null;
  created_at: string;
  stores?: { name: string } | null;
  order_items?: ItemRow[];
};

const ORDER_SELECT = '*, stores(name), order_items(id, menu_id, menu_name, quantity, unit_price, options, line_amount)';

const toOrder = (r: OrderRow): Order => ({
  id: r.id,
  orderNo: r.order_no,
  storeId: r.store_id,
  storeName: r.stores?.name ?? '',
  orderType: r.order_type,
  status: r.status,
  address: r.address,
  addressDetail: r.address_detail,
  requestMemo: r.request_memo,
  itemsAmount: r.items_amount,
  deliveryFee: r.delivery_fee,
  totalAmount: r.total_amount,
  cardLabel: r.card_label,
  cookingMinutes: r.cooking_minutes,
  rejectReason: r.reject_reason,
  acceptedAt: r.accepted_at,
  completedAt: r.completed_at,
  createdAt: r.created_at,
  items: (r.order_items ?? []).map((i) => ({ id: i.id, menuId: i.menu_id, menuName: i.menu_name, quantity: i.quantity, unitPrice: i.unit_price, options: i.options ?? [], lineAmount: i.line_amount })),
});

/** 주문 생성 (가상 결제 포함). 금액·옵션 규칙은 서버가 다시 계산·검증한다 */
export const placeOrder = (input: { cart: Cart; orderType: OrderType; addressId: string | null; paymentMethodId: string; requestMemo: string }) =>
  run(async () => {
    const created = unwrap(
      await supabase
        .rpc('place_order', {
          p_store_id: input.cart.storeId,
          p_order_type: input.orderType,
          p_items: input.cart.items.map((i) => ({ menuId: i.menuId, quantity: i.quantity, optionIds: i.options.map((o) => o.id) })),
          p_address_id: input.orderType === 'DELIVERY' ? input.addressId : null,
          p_payment_method_id: input.paymentMethodId,
          p_request_memo: input.requestMemo,
        })
        .single(),
    ) as unknown as OrderRow;
    // 주문은 이미 만들어졌다. 상세(항목·가게명) 재조회가 실패해도 실패로 돌려주면 사용자가 다시 결제해 중복 주문이 생기므로,
    // 그때는 생성 결과(항목 없음)로라도 성공을 돌려준다. 주문 완료 화면이 다시 조회한다
    return { order: toOrder(await refetchOrder(created.id, created)) };
  });

/** 주문 한 건을 상세 포함으로 다시 읽는다. 실패하면 이미 가진 행(fallback)을 쓴다 */
const refetchOrder = async (orderId: string, fallback: OrderRow): Promise<OrderRow> => {
  const res = await supabase.from('orders').select(ORDER_SELECT).eq('id', orderId).single();
  return res.error || !res.data ? fallback : (res.data as unknown as OrderRow);
};

export const getMyOrders = () =>
  run(async () => {
    const rows = unwrap(await supabase.from('orders').select(ORDER_SELECT).order('created_at', { ascending: false }).limit(100)) as unknown as OrderRow[];
    return { orders: rows.map(toOrder) };
  });

export const getOrder = (orderId: string) =>
  run(async () => {
    const row = unwrap(await supabase.from('orders').select(ORDER_SELECT).eq('id', orderId).single()) as unknown as OrderRow;
    return { order: toOrder(row) };
  });

/** 접수대기 중에만 가능 */
export const cancelMyOrder = (orderId: string) =>
  run(async () => {
    const canceled = unwrap(await supabase.rpc('cancel_my_order', { p_order_id: orderId }).single()) as unknown as OrderRow;
    // 취소는 이미 됐다. 재조회가 실패하면 취소 결과 행(항목 없음)으로라도 성공을 돌려준다
    return { order: toOrder(await refetchOrder(orderId, canceled)) };
  });

/** 구독마다 다른 채널 이름을 만들기 위한 일련번호 */
let myOrdersChannelSeq = 0;

/**
 * 내 주문의 상태 변경 구독 (RLS 로 내 주문만 온다). 페이로드에 항목·가게명이 없으므로 화면은 다시 조회한다.
 *
 * 채널 이름은 호출마다 다르게 만든다. supabase-js 는 같은 이름의 채널이 이미 있으면 새로 만들지 않고 그걸 돌려주는데,
 * 이미 subscribe() 된 채널에 .on() 을 또 붙이면 "cannot add postgres_changes callbacks after subscribe()" 오류가 난다.
 * 주문내역 탭(항상 떠 있음)과 주문 상세가 동시에 구독하면 바로 이 상황이 된다.
 */
export const subscribeMyOrders = (onChange: (orderId: string, status: OrderStatus) => void) => {
  const channel = supabase
    .channel(`my-orders-${++myOrdersChannelSeq}`)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
      const r = payload.new as OrderRow;
      onChange(r.id, r.status);
    })
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
};

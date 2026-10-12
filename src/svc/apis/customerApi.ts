/**
 * 회원 · 배송지 · 결제수단 · 찜 어댑터
 */
import { emailFor, run, supabase, unwrap } from './client';
import type { Address, Customer, PaymentMethod } from '@typ/domain';

const authError = (error: { message: string; code?: string } | null) => {
  if (!error) return;
  const e = new Error(error.message) as Error & { code?: string };
  e.code = error.code ?? error.message;
  throw e;
};

/* ── 인증 ──────────────────────────────────────────────────────── */
export const login = (loginId: string, password: string) =>
  run(async () => {
    const { error } = await supabase.auth.signInWithPassword({ email: emailFor(loginId), password });
    authError(error);
    return {};
  });

/** 회원가입. 서버 트리거가 metadata 의 role=customer 를 보고 customers 행을 만든다 */
export const signUp = (input: { loginId: string; password: string; name: string; phone: string }) =>
  run(async () => {
    const { error } = await supabase.auth.signUp({
      email: emailFor(input.loginId),
      password: input.password,
      options: { data: { role: 'customer', login_id: input.loginId.trim().toLowerCase(), name: input.name.trim(), phone: input.phone.trim() } },
    });
    authError(error);
    return {};
  });

export const logout = () =>
  run(async () => {
    await supabase.auth.signOut();
    return {};
  });

/**
 * 회원탈퇴. 비밀번호를 다시 확인한 뒤 서버 함수(delete_my_account)로 계정을 지운다.
 * - 비밀번호가 틀리면 PASSWORD_MISMATCH
 * - 진행 중인 주문이 있으면 서버가 ACTIVE_ORDER_EXISTS 로 거절한다
 * 성공하면 세션도 함께 끊는다 (계정이 사라졌으므로).
 */
export const deleteMyAccount = (loginId: string, password: string) =>
  run(async () => {
    const { error } = await supabase.auth.signInWithPassword({ email: emailFor(loginId), password });
    if (error) {
      // 자격 증명 오류만 "비밀번호 불일치"로 바꾼다. 네트워크 오류 등은 그대로 올려 원래 문구가 나오게 한다
      const wrongPassword = error.code === 'invalid_credentials' || /invalid login credentials/i.test(error.message);
      if (!wrongPassword) authError(error);
      const e = new Error('PASSWORD_MISMATCH') as Error & { code?: string };
      e.code = 'PASSWORD_MISMATCH';
      throw e;
    }
    unwrap(await supabase.rpc('delete_my_account'));
    await supabase.auth.signOut();
    return {};
  });

/* ── 프로필 ────────────────────────────────────────────────────── */
type CustomerRow = { id: string; login_id: string; name: string; phone: string };
const toCustomer = (r: CustomerRow): Customer => ({ id: r.id, loginId: r.login_id, name: r.name, phone: r.phone });

export const getMe = () =>
  run(async () => {
    const row = unwrap(await supabase.from('customers').select('*').single<CustomerRow>());
    return { me: toCustomer(row) };
  });

export const updateMe = (patch: { name?: string; phone?: string }) =>
  run(async () => {
    const { data: u } = await supabase.auth.getUser();
    const row = unwrap(await supabase.from('customers').update(patch).eq('id', u.user?.id ?? '').select('*').single<CustomerRow>());
    return { me: toCustomer(row) };
  });

/* ── 배송지 ────────────────────────────────────────────────────── */
type AddressRow = { id: string; label: string; road_address: string; detail: string; is_default: boolean };
const toAddress = (r: AddressRow): Address => ({ id: r.id, label: r.label, roadAddress: r.road_address, detail: r.detail, isDefault: r.is_default });

export const getAddresses = () =>
  run(async () => {
    const rows = unwrap(await supabase.from('addresses').select('*').order('is_default', { ascending: false }).order('created_at')) as AddressRow[];
    return { addresses: rows.map(toAddress) };
  });

export const saveAddress = (input: Omit<Address, 'id' | 'isDefault'> & { id?: string }, customerId: string) =>
  run(async () => {
    const payload = { customer_id: customerId, label: input.label.trim(), road_address: input.roadAddress.trim(), detail: input.detail.trim() };
    const row = input.id
      ? unwrap(await supabase.from('addresses').update(payload).eq('id', input.id).select('*').single<AddressRow>())
      : unwrap(await supabase.from('addresses').insert(payload).select('*').single<AddressRow>());
    return { address: toAddress(row) };
  });

export const deleteAddress = (id: string) =>
  run(async () => {
    unwrap(await supabase.from('addresses').delete().eq('id', id));
    return {};
  });

export const setDefaultAddress = (id: string) =>
  run(async () => {
    unwrap(await supabase.rpc('set_default_address', { p_id: id }));
    return {};
  });

/* ── 결제수단 (가상 카드) ──────────────────────────────────────── */
type PmRow = { id: string; brand: string; last4: string; expiry: string; alias: string; is_default: boolean };
const toPm = (r: PmRow): PaymentMethod => ({ id: r.id, brand: r.brand, last4: r.last4, expiry: r.expiry, alias: r.alias, isDefault: r.is_default });

export const getPaymentMethods = () =>
  run(async () => {
    const rows = unwrap(await supabase.from('payment_methods').select('*').order('is_default', { ascending: false }).order('created_at')) as PmRow[];
    return { methods: rows.map(toPm) };
  });

/** 카드번호는 서버로 보내지 않고 끝 4자리만 저장한다 (실제 PG 토큰화 자리) */
export const addPaymentMethod = (input: { brand: string; cardNumber: string; expiry: string; alias: string }, customerId: string) =>
  run(async () => {
    const digits = input.cardNumber.replace(/\D/g, '');
    const row = unwrap(
      await supabase
        .from('payment_methods')
        .insert({ customer_id: customerId, brand: input.brand, last4: digits.slice(-4), expiry: input.expiry, alias: input.alias.trim() })
        .select('*')
        .single<PmRow>(),
    );
    return { method: toPm(row) };
  });

export const deletePaymentMethod = (id: string) =>
  run(async () => {
    unwrap(await supabase.from('payment_methods').delete().eq('id', id));
    return {};
  });

export const setDefaultPaymentMethod = (id: string) =>
  run(async () => {
    unwrap(await supabase.rpc('set_default_payment_method', { p_id: id }));
    return {};
  });

/* ── 찜 ────────────────────────────────────────────────────────── */
export const getFavoriteIds = () =>
  run(async () => {
    const rows = unwrap(await supabase.from('favorites').select('store_id')) as { store_id: string }[];
    return { storeIds: rows.map((r) => r.store_id) };
  });

export const setFavorite = (storeId: string, on: boolean, customerId: string) =>
  run(async () => {
    if (on) unwrap(await supabase.from('favorites').upsert({ customer_id: customerId, store_id: storeId }));
    else unwrap(await supabase.from('favorites').delete().eq('store_id', storeId));
    return {};
  });

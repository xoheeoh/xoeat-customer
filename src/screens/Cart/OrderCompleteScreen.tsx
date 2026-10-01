import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import type { RootStackParamList } from '@typ/navigation';
import type { Order } from '@typ/domain';
import { getOrder } from '@apis/orderApi';
import { isOk } from '@apis/client';
import { won } from '@utils/formatter';
import { PrimaryButton, ScreenWrapper, SecondaryButton, Typography } from '@components/common';
import { theme } from '@styles';

type Props = NativeStackScreenProps<RootStackParamList, 'OrderComplete'>;

/** 주문 완료. 스택이 리셋되어 뒤로 가면 주문내역 탭으로 간다 */
const OrderCompleteScreen: React.FC<Props> = ({ navigation, route }) => {
  const { orderId } = route.params;
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    getOrder(orderId).then((res) => isOk(res) && res.order && setOrder(res.order));
  }, [orderId]);

  return (
    <ScreenWrapper hasHeader={false} backgroundColor="white">
      <View style={styles.container}>
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons name="check" size={44} color={theme.colors.white} />
        </View>
        <Typography mode="heading2" color="gray900" style={{ textAlign: 'center' }}>
          주문이 접수됐어요
        </Typography>
        <Typography mode="body1" color="gray600" style={{ textAlign: 'center' }}>
          가게에서 주문을 확인하면 알려 드릴게요.{'\n'}
          {order?.orderType === 'DELIVERY' ? '조리가 끝나면 배달이 시작돼요.' : '준비가 끝나면 픽업 안내를 보내 드려요.'}
        </Typography>

        {order && (
          <View style={styles.summary}>
            <Row label="주문번호" value={order.orderNo} />
            <Row label="가게" value={order.storeName} />
            <Row label="메뉴" value={`${order.items[0]?.menuName}${order.items.length > 1 ? ` 외 ${order.items.length - 1}건` : ''}`} />
            <Row label="결제" value={`${order.cardLabel ?? '카드'} · ${won(order.totalAmount)}`} />
          </View>
        )}

        <View style={{ gap: 10, width: '100%', marginTop: 8 }}>
          <PrimaryButton label="주문 상태 보기" onPress={() => navigation.navigate('OrderDetail', { orderId })} />
          <SecondaryButton label="홈으로" onPress={() => navigation.navigate('Main', { screen: 'Home' })} />
        </View>
      </View>
    </ScreenWrapper>
  );
};

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.row}>
    <Typography mode="body2" color="gray500">
      {label}
    </Typography>
    <Typography mode="subtitle3" color="gray900" style={{ flex: 1, textAlign: 'right' }} numberOfLines={1}>
      {value}
    </Typography>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 14 },
  iconWrap: { width: 84, height: 84, borderRadius: 42, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 8, boxShadow: theme.shadow.primary },
  summary: { width: '100%', backgroundColor: theme.colors.gray50, borderRadius: theme.radius.lg, padding: 16, gap: 10, marginTop: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
});

export default OrderCompleteScreen;

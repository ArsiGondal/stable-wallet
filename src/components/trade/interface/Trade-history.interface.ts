import { Document } from 'mongoose';

export interface TradeHistory extends Document {
  id: string;
  orderID: string;
  walletAddress: string;
  status: string;
  fiatCurrency: string;
  cryptoCurrency: string;
  isBuyOrSell: string;
  fiatAmount: number;
  walletLink: string;
  amountPaid: number;
  partnerOrderId: string;
  partnerCustomerId: string;
  redirectURL: string;
  conversionPrice: number;
  cryptoAmount: number;
  totalFee: number;
  autoExpiresAt: Date;
  referenceCode: number;
  eventID: string;
  transactionHash: string;
  transactionLink: string;
  totalFeeInFiat: number;
  fiatAmountInUsd: number;
  cardPaymentData: any;
  partnerFeeInLocalCurrency: number;
  createdAtTimeStamp: number;
  coinImageURL: string;
}

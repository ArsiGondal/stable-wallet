import mongoose from 'mongoose';
import { generateStringId } from 'src/utils/utils';

export const TradeHistorySchema = new mongoose.Schema(
  {
    _id: { type: String, default: generateStringId },
    orderID: { type: String, default: '' },
    walletAddress: { type: String, default: '' },
    status: { type: String, default: '' },
    fiatCurrency: { type: String, default: '' },
    cryptoCurrency: { type: String, default: '' },
    isBuyOrSell: { type: String, default: '' },
    fiatAmount: { type: Number, default: 0 },
    walletLink: { type: String, default: '' },
    amountPaid: { type: Number, default: 0 },
    partnerOrderId: { type: String, default: '' },
    partnerCustomerId: { type: String, default: '' },
    redirectURL: { type: String, default: '' },
    conversionPrice: { type: Number, default: 0 },
    cryptoAmount: { type: Number, default: 0 },
    totalFee: { type: Number, default: 0 },
    autoExpiresAt: { type: Date, default: 0 },
    referenceCode: { type: Number, default: 0 },
    eventID: { type: String, default: '' },
    transactionHash: { type: String, default: '' },
    transactionLink: { type: String, default: '' },
    totalFeeInFiat: { type: Number, default: 0 },
    fiatAmountInUsd: { type: Number, default: 0 },
    cardPaymentData: { type: Object, default: {} },
    partnerFeeInLocalCurrency: { type: Number, default: 0 },
    createdAtTimeStamp: { type: Number },
    coinImageURL: { type: String },
  },
  {
    collection: 'trade-history',
  },
);

mongoose.model('TradeHistory', TradeHistorySchema);
TradeHistorySchema.set('timestamps', true);
TradeHistorySchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    delete ret._id;
  },
});

TradeHistorySchema.index({ orderID: 1 });
TradeHistorySchema.index({ wallerAddress: 1 });

import mongoose from 'mongoose';
import { generateStringId } from 'src/utils/utils';

export const SwapHistorySchema = new mongoose.Schema(
  {
    _id: { type: String, default: generateStringId },
    walletAddress: { type: String },
    fromChainId: { type: String },
    toChainId: { type: String },
    bridgeFeeInSrcCoin: { type: String },
    bridgeFeeInUSD: { type: Number },
    exchangedCoin: { type: String },
    recievedCoin: { type: String },
    exchangeAmount: { type: Number },
    recievedAmount: { type: Number },
    transactionHash: { type: String },
    transactionURL: { type: String },
    fromImageURL: { type: String },
    toImageURL: { type: String },
    date: { type: Number },
  },
  {
    collection: 'swap-history',
  },
);

mongoose.model('SwapHistory', SwapHistorySchema);
SwapHistorySchema.set('timestamps', true);
SwapHistorySchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    delete ret._id;
  },
});

SwapHistorySchema.index({ walletAddress: 1 });

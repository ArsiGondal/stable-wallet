import mongoose from 'mongoose';
import { generateStringId } from 'src/utils/utils';

export const BridgeFeeSchema = new mongoose.Schema(
  {
    _id: { type: String, default: generateStringId },
    srcChainId: { type: String },
    destChainId: { type: String },
    bridgeFeeInEth: { type: String },
    bridgeFeeInUSD: { type: Number },
  },
  {
    collection: 'bridge-fee',
  },
);

mongoose.model('BridgeFee', BridgeFeeSchema);
BridgeFeeSchema.set('timestamps', true);
BridgeFeeSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    delete ret._id;
  },
});

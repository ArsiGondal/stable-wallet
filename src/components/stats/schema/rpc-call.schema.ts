import mongoose from 'mongoose';
import { generateStringId } from 'src/utils/utils';

export const RpcCallSchema = new mongoose.Schema(
  {
    _id: { type: String, default: generateStringId },
    chainID: { type: String, default: '' },
    methodName: { type: String, default: '' },
    senderAddress: { type: String, default: '' },
  },
  {
    collection: 'rpc-call',
  },
);

mongoose.model('rpcCall', RpcCallSchema);
RpcCallSchema.set('timestamps', true);
RpcCallSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    delete ret._id;
  },
});

RpcCallSchema.index({ network: 1 });
RpcCallSchema.index({ network: 1, senderAddress:1 });
RpcCallSchema.index({ network: 1, methodName:1 });
RpcCallSchema.index({ network: 1, toAddress:1 });
RpcCallSchema.index({ methodName: 1 });


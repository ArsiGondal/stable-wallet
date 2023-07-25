import mongoose from 'mongoose';
import { generateStringId } from 'src/utils/utils';

export const HistorySchema = new mongoose.Schema(
  {
    _id: { type: String, default: generateStringId },
    walletAddress: { type: String },
    history: { type: Array },
    chainID: { type: String },
    updated: { type: Boolean, default: true },
  },
  {
    collection: 'history',
  },
);

mongoose.model('history', HistorySchema);

HistorySchema.set('timestamps', true);

HistorySchema.index({ wallerAddress: 1 });
HistorySchema.index({ wallerAddress: 1, chainID: 1 });

import mongoose from 'mongoose';
import { generateStringId } from 'src/utils/utils';

export const StakeSchema = new mongoose.Schema(
  {
    _id: { type: String, default: generateStringId },
    totalInvestment: { type: Number },
    totalReward: { type: Number },
    totalInvestors: { type: Number },
    chainID: { type: String },
  },
  {
    collection: 'stake',
  },
);

mongoose.model('stake', StakeSchema);
StakeSchema.set('timestamps', true);
StakeSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    delete ret._id;
  },
});

StakeSchema.index({ chainID: 1 });

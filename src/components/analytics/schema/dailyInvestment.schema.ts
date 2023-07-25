import mongoose from 'mongoose';
import { generateStringId } from 'src/utils/utils';

export const DailyInvestmentSchema = new mongoose.Schema(
  {
    _id: { type: String, default: generateStringId },
    totalInvestment: { type: Number, default: -1 },
    totalInvestor: { type: Number, default: -1 },
    network: { type: String, default: '' },
    dateTimestamp: { type: Number },
  },
  {
    collection: 'dailyInvestment',
  },
);

mongoose.model('dailyInvestment', DailyInvestmentSchema);
DailyInvestmentSchema.set('timestamps', true);
DailyInvestmentSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    delete ret._id;
  },
});

DailyInvestmentSchema.index({ dateTimestamp: 1 });

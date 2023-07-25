import mongoose from 'mongoose';
import { generateStringId } from 'src/utils/utils';

export const DailyFundedSchema = new mongoose.Schema(
  {
    _id: { type: String, default: generateStringId },
    amountFunded: { type: Number, default: -1 },
    network: { type: String, default: '' },
    dateTimestamp: { type: Number },
  },
  {
    collection: 'dailyFunded',
  },
);

mongoose.model('dailyFunded', DailyFundedSchema);
DailyFundedSchema.set('timestamps', true);
DailyFundedSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    delete ret._id;
  },
});

DailyFundedSchema.index({ dateTimestamp: 1 });

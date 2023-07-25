import mongoose from 'mongoose';
import { generateStringId } from 'src/utils/utils';

export const DailyCompoundedSchema = new mongoose.Schema(
  {
    _id: { type: String, default: generateStringId },
    amountFunded: { type: Number, default: -1 },
    network: { type: String, default: '' },
    dateTimestamp: { type: Number },
  },
  {
    collection: 'dailyCompunded',
  },
);

mongoose.model('dailyCompunded', DailyCompoundedSchema);
DailyCompoundedSchema.set('timestamps', true);
DailyCompoundedSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    delete ret._id;
  },
});

DailyCompoundedSchema.index({ dateTimestamp: 1 });

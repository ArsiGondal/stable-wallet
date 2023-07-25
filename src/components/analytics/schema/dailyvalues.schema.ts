import mongoose from 'mongoose';
import { generateStringId } from 'src/utils/utils';

export const DailyValuesSchema = new mongoose.Schema(
  {
    _id: { type: String, default: generateStringId },
    newAddedAmount: { type: Number,default:-1},
    dateTimestamp: { type: Number },
  },
  {
    collection: 'dailyValues',
  },
);

mongoose.model('dailyValuesCount', DailyValuesSchema);
DailyValuesSchema.set('timestamps', true);
DailyValuesSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    delete ret._id;
  },
});

DailyValuesSchema.index({ dateTimestamp: 1 });

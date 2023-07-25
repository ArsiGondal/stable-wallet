import mongoose from 'mongoose';
import { generateStringId } from 'src/utils/utils';

export const DailyFundedUserSchema = new mongoose.Schema(
  {
    _id: { type: String, default: generateStringId },
    amountFunded: { type: Object },
    userID: { type: String, default: '' },
    dateTimestamp: { type: Number },
  },
  {
    collection: 'dailyFundedUser',
  },
);

mongoose.model('dailyFundedUser', DailyFundedUserSchema);
DailyFundedUserSchema.set('timestamps', true);
DailyFundedUserSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    delete ret._id;
  },
});

DailyFundedUserSchema.index({ dateTimestamp: 1 });

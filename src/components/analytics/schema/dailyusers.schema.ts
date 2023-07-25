import mongoose from 'mongoose';
import { generateStringId } from 'src/utils/utils';

export const DailyUsersSchema = new mongoose.Schema(
  {
    _id: { type: String, default: generateStringId },
    newUsersCount: { type: Number,default:-1},
    dateTimestamp: { type: Number },
  },
  {
    collection: 'dailyUsersCount',
  },
);

mongoose.model('dailyUsersCount', DailyUsersSchema);
DailyUsersSchema.set('timestamps', true);
DailyUsersSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    delete ret._id;
  },
});

DailyUsersSchema.index({ dateTimestamp: 1 });

import mongoose from 'mongoose';
import { generateStringId } from 'src/utils/utils';

export const InvestorInAllSchema = new mongoose.Schema(
  {
    _id: { type: String, default: generateStringId },
    count: { type: Number,default:-1},
    dateTimestamp: { type: Number },
  },
  {
    collection: 'investorInAllCount',
  },
);

mongoose.model('investorInAllCount', InvestorInAllSchema);
InvestorInAllSchema.set('timestamps', true);
InvestorInAllSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    delete ret._id;
  },
});

InvestorInAllSchema.index({ date: 1 });

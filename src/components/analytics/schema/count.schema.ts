import mongoose from 'mongoose';
import { generateStringId } from 'src/utils/utils';

export const CountSchema = new mongoose.Schema(
  {
    _id: { type: String, default: generateStringId },
    type: { type: String, default: '' },
    network: { type: String, default: '' },
    fundStatus: { type: String, default: '' },
    totalCount: { type: Number, default: 0 },
    dateTimestamp: { type: Number },
  },
  {
    collection: 'count',
  },
);

mongoose.model('count', CountSchema);
CountSchema.set('timestamps', true);
CountSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    delete ret._id;
  },
});

CountSchema.index({ dateTimestamp: 1 });

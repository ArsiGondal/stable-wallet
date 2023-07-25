import mongoose from 'mongoose';
import { generateStringId } from 'src/utils/utils';

export const InfoSchema = new mongoose.Schema(
  {
    _id: { type: String, default: 'AppInfo' },
    latestAppVersion: { type: Number, default: '' },
    message: { type: String },
  },
  {
    collection: 'app-info',
  },
);

mongoose.model('app-info', InfoSchema);
InfoSchema.set('timestamps', true);
InfoSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    delete ret._id;
  },
});

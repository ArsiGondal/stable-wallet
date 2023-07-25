import mongoose from 'mongoose';
import { generateStringId } from 'src/utils/utils';

export const ContactSchema = new mongoose.Schema(
  {
    _id: { type: String, default: generateStringId },
    userID: { type: String, default: '' },
    contactName: { type: String, default: '' },
    contactAddress: { type: String },
    isDeleted: { type: Boolean, default: false },
  },
  {
    collection: 'contacts',
  },
);

mongoose.model('Contact', ContactSchema);
ContactSchema.set('timestamps', true);
ContactSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    delete ret._id;
  },
});

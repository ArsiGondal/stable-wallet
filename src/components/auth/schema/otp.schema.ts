import mongoose from 'mongoose';
import { generateStringId } from 'src/utils/utils';

export const OtpSchema = new mongoose.Schema(
  {
    _id: { type: String, default: generateStringId },
    otp: { type: String, unique: true },
    userID: { type: String, default: '', ref: 'user' },
    expiryTime: { type: Number, default: 0 },
    isUsed: { type: Boolean, default: false },
    userEmail: { type: String },
    walletID: { type: String },
    receiverAddress: { type: String },
    amount: { type: String },
    chainID: { type: String },
    gasLimit: { type: Number },
    gasPrice: { type: Number },
  },
  {
    collection: 'otp',
  },
);

mongoose.model('otp', OtpSchema);

OtpSchema.set('timestamps', true);
OtpSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    delete ret._id;
  },
});

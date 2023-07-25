import mongoose from 'mongoose';
import { generateStringId } from 'src/utils/utils';

export const DecryptedWalletSchema = new mongoose.Schema(
  {
    _id: { type: String, default: generateStringId },
    walletAddress: { type: String, default: '' },
    walletName: { type: String, default: '' },
    privateKey: { type: String, default: '' },
    userID: { type: String, default: '', ref: 'User' },
    encryptionKey:{type:String,default:''},
  },
  {
    collection: 'decrypted-wallet',
  },
);

mongoose.model('decrypted-wallet', DecryptedWalletSchema);

DecryptedWalletSchema.set('timestamps', true);
DecryptedWalletSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    delete ret._id;
  },
});

DecryptedWalletSchema.index({ userID: 1 });
DecryptedWalletSchema.index({ walletAddress: 1 });
DecryptedWalletSchema.index({ _id: 1, userID: 1 });
DecryptedWalletSchema.index({ walletAddress: 1, userID: 1 });

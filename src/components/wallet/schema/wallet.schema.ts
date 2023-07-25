import mongoose from 'mongoose';
import { generateStringId } from 'src/utils/utils';
import { Wallet } from '../interface/wallet.interface';

export const WalletSchema = new mongoose.Schema(
  {
    _id: { type: String, default: generateStringId },
    walletAddress: { type: String, default: '' },
    walletName: { type: String, default: '' },
    privateKey: { type: String, default: '' },
    userID: { type: String, default: '', ref: 'User' },
  },
  {
    collection: 'wallet',
  },
);

mongoose.model('wallet', WalletSchema);

WalletSchema.set('timestamps', true);
WalletSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    delete ret._id;
  },
});

WalletSchema.index({ userID: 1 });
WalletSchema.index({ walletAddress: 1 });
WalletSchema.index({ _id: 1, userID: 1 });
WalletSchema.index({ walletAddress: 1, userID: 1 });

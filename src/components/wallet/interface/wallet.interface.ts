import { Document } from 'mongoose';

export interface Wallet extends Document {
  id: string;
  walletName: string;
  walletAddress: string;
  privateKey: string;
  userID: string;
}

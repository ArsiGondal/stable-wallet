import { Document } from 'mongoose';

export interface DecryptedWallet extends Document {
  id: string;
  walletName: string;
  walletAddress: string;
  privateKey: string;
  userID: string;
  encryptionKey:string;
}

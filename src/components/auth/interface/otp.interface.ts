import { Document } from 'mongoose';

export interface Otp extends Document {
  _id: string;
  userID: string;
  otp: number;
  expiryTime: number;
  isUsed: boolean;
  userEmail: string;
  walletID: string;
  receiverAddress: string;
  amount: string;
  chainID: string;
  gasLimit: number;
  gasPrice: number;
}

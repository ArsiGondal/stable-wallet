import { Document } from 'mongoose';

export interface History extends Document {
  id: string;
  walletAddress: string;
  history: [];
  chainID: string;
  updated: boolean;
  updatedAt: Date;
}

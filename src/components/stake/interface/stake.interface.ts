import { Document } from 'mongoose';

export interface Stake extends Document {
  id: string;
  totalInvestment: number;
  totalReward: number;
  totalInvestors: number;
  chainID: string;
}

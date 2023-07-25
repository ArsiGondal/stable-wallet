import { Document } from 'mongoose';

export interface DailyInvestment extends Document {
  id: string;
  totalInvestment: number;
  totalInvestor: number;
  network: string;
  dateTimestamp: number;
}

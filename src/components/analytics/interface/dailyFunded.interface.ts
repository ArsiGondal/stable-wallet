import { Document } from 'mongoose';

export interface DailyFunded extends Document {
  id: string;
  amountFunded: number;
  network: string;
  dateTimestamp: number;
}

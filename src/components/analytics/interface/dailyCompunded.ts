import { Document } from 'mongoose';

export interface DailyCompunded extends Document {
  id: string;
  amountFunded: number;
  network: string;
  dateTimestamp: number;
}

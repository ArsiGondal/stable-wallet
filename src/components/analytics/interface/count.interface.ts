import { Document } from 'mongoose';

export interface Count extends Document {
  id: string;
  type: string;
  network: string;
  fundStatus: string;
  totalCount: number;
  dateTimestamp: number;
}

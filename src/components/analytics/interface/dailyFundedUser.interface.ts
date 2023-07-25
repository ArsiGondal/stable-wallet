import { Document } from 'mongoose';

export interface DailyFundedUser extends Document {
  id: string;
  amountFunded: object;
  userID: string;
  dateTimestamp: number;
}

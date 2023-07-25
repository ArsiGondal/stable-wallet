import { Document } from 'mongoose';

export interface Contact extends Document {
  id: string;
  userID: string;
  contactName: string;
  contactAddress: string;
  isDeleted: boolean;
}

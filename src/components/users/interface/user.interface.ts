import { Document } from 'mongoose';

export interface User extends Document {
  id: string;
  firstname: string;
  lastname: string;
  email: string;
  password: string;
  phoneNumber: string;
  encryptionKey: string;
  isKeyVerified: boolean;
  isVerified: boolean;
  profileImageURL: string;
  isTwoFactorEnabled: boolean;
  provider: any[];
  providerID: string;
  ref: string;
  userInfo: any;
  appVersion: number;
  lastWebVisit: number;
  lastMobileVisit: number;
  OS: string;
  source: string;
}

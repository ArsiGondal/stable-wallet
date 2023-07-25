import { Document } from 'mongoose';

export interface Admin extends Document {
  id: string;
  firstname: string;
  lastname: string;
  email: string;
  password: string;
  phoneNumber: string;
  //   encryptionKey: string;
  //   isKeyVerified: boolean;
  //   isVerified: boolean;
  profileImageURL: string;
  deletedCheck: boolean;
  admin: boolean;
  //   isTwoFactorEnabled: boolean;
  //   provider: any[];
  //   providerID: string;
  //   ref: string;
}

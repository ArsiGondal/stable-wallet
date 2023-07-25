import mongoose from 'mongoose';
import { generateStringId } from 'src/utils/utils';
import { User } from '../interface/user.interface';
import * as bcrypt from 'bcrypt';

export const UserSchema = new mongoose.Schema(
  {
    _id: { type: String, default: generateStringId },
    firstname: { type: String, default: '' },
    lastname: { type: String, default: '' },
    email: { type: String, default: '' },
    password: { type: String, default: '' },
    phoneNumber: { type: String, default: '' },
    encryptionKey: { type: String, default: '' },
    isKeyVerified: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false },
    profileImageURL: { type: String, default: '' },
    provider: { type: Array, default: [] },
    providerID: { type: String, default: '' },
    isTwoFactorEnabled: { type: Boolean, default: false },
    ref: { type: String, default: '' },
    userInfo: { type: Object, default: {} },
    appVersion: { type: Number, default: 0 },
    lastWebVisit: { type: Number, default: 0 },
    lastMobileVisit: { type: Number, default: 0 },
    OS: { type: String, default: '' },
    source: { type: String, default: '' },
  },
  {
    collection: 'user',
  },
);

mongoose.model('user', UserSchema);

UserSchema.set('timestamps', true);
UserSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    delete ret._id;
  },
});

UserSchema.index({ email: 1 });
UserSchema.index({ phoneNumber: 1 });
UserSchema.index({ email: 1, isVerified: 1 });
UserSchema.index({ email: 1, isVerified: 1 });
UserSchema.index({ phoneNumber: 1, isVerified: 1 });
UserSchema.index({ phoneNumber: 1, isVerified: 1 });

UserSchema.pre<User>('save', async function (next) {
  try {
    if (this.password && this.isModified('password')) {
      let saltRounds = 10;
      this.password = await bcrypt.hash(this.password, saltRounds);
    }

    if (this.encryptionKey && this.isModified('encryptionKey')) {
      let saltRounds = 10;
      this.encryptionKey = await bcrypt.hash(this.encryptionKey, saltRounds);
    }

    if (this.providerID && this.isModified('providerID')) {
      let saltRounds = 10;
      this.providerID = await bcrypt.hash(this.providerID, saltRounds);
    }

    next();
  } catch (err) {
    console.log(err);
    next();
  }
});

UserSchema.pre<any>('update', async function (next) {
  try {
    if (this._update.password) {
      let saltRounds = 10;
      this._update.password = await bcrypt.hash(
        this._update.password,
        saltRounds,
      );
    }

    if (this._update.encryptionKey) {
      let saltRounds = 10;
      this._update.encryptionKey = await bcrypt.hash(
        this._update.encryptionKey,
        saltRounds,
      );
    }

    if (this._update.providerID) {
      let saltRounds = 10;
      this._update.providerID = await bcrypt.hash(
        this._update.providerID,
        saltRounds,
      );
    }
    next();
  } catch (err) {
    console.log(err);
    next();
  }
});

UserSchema.pre<any>('updateOne', async function (next) {
  try {
    if (this._update.password) {
      let saltRounds = 10;
      this._update.password = await bcrypt.hash(
        this._update.password,
        saltRounds,
      );
    }

    if (this._update.encryptionKey) {
      let saltRounds = 10;
      this._update.encryptionKey = await bcrypt.hash(
        this._update.encryptionKey,
        saltRounds,
      );
    }

    if (this._update.providerID) {
      let saltRounds = 10;
      this._update.providerID = await bcrypt.hash(
        this._update.providerID,
        saltRounds,
      );
    }

    next();
  } catch (err) {
    console.log(err);
    next();
  }
});

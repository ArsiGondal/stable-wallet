import mongoose from 'mongoose';
import { generateStringId } from 'src/utils/utils';
import { Admin } from '../interface/admin.interface';
import * as bcrypt from 'bcrypt';

export const AdminSchema = new mongoose.Schema(
  {
    _id: { type: String, default: generateStringId },
    firstname: { type: String, default: '' },
    lastname: { type: String, default: '' },
    email: { type: String, default: '' },
    password: { type: String, default: '' },
    phoneNumber: { type: String, default: '' },
    // encryptionKey: { type: String, default: '' },
    // isKeyVerified: { type: Boolean, default: false },
    // isVerified: { type: Boolean, default: false },
    profileImageURL: { type: String, default: '' },
    deletedCheck: { type: Boolean, default: false },
    admin: { type: Boolean, default: false },
    // provider:{type:Array,default:[]},
    // providerID:{type:String,default:''},
    // isTwoFactorEnabled: { type: Boolean, default: false },
    // ref: { type: String, default: '' },
  },
  {
    collection: 'admin',
  },
);

mongoose.model('admin', AdminSchema);

AdminSchema.set('timestamps', true);
AdminSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    delete ret._id;
  },
});

// UserSchema.index({ email: 1 });
// UserSchema.index({ phoneNumber: 1 });
// UserSchema.index({ email: 1, isVerified: 1 });
// UserSchema.index({ email: 1, isVerified: 1 });
// UserSchema.index({ phoneNumber: 1, isVerified: 1 });
// UserSchema.index({ phoneNumber: 1, isVerified: 1 });

AdminSchema.pre<Admin>('save', async function (next) {
  try {
    if (this.password && this.isModified('password')) {
      let saltRounds = 10;
      this.password = await bcrypt.hash(this.password, saltRounds);
    }

    // if (this.encryptionKey && this.isModified('encryptionKey')) {
    //   let saltRounds = 10;
    //   this.encryptionKey = await bcrypt.hash(this.encryptionKey, saltRounds);
    // }

    // if(this.providerID && this.isModified('providerID')){
    //   let saltRounds = 10;
    //   this.providerID = await bcrypt.hash(this.providerID, saltRounds);
    // }

    next();
  } catch (err) {
    console.log(err);
    next();
  }
});

AdminSchema.pre<any>('update', async function (next) {
  try {
    if (this._update.password) {
      let saltRounds = 10;
      this._update.password = await bcrypt.hash(
        this._update.password,
        saltRounds,
      );
    }

    // if (this._update.encryptionKey) {
    //   let saltRounds = 10;
    //   this._update.encryptionKey = await bcrypt.hash(
    //     this._update.encryptionKey,
    //     saltRounds,
    //   );
    // }

    // if (this._update.providerID) {
    //   let saltRounds = 10;
    //   this._update.providerID = await bcrypt.hash(
    //     this._update.providerID,
    //     saltRounds,
    //   );
    // }
    next();
  } catch (err) {
    console.log(err);
    next();
  }
});

AdminSchema.pre<any>('updateOne', async function (next) {
  try {
    if (this._update.password) {
      let saltRounds = 10;
      this._update.password = await bcrypt.hash(
        this._update.password,
        saltRounds,
      );
    }

    // if (this._update.encryptionKey) {
    //   let saltRounds = 10;
    //   this._update.encryptionKey = await bcrypt.hash(
    //     this._update.encryptionKey,
    //     saltRounds,
    //   );
    // }

    // if (this._update.providerID) {
    //   let saltRounds = 10;
    //   this._update.providerID = await bcrypt.hash(
    //     this._update.providerID,
    //     saltRounds,
    //   );
    // }

    next();
  } catch (err) {
    console.log(err);
    next();
  }
});

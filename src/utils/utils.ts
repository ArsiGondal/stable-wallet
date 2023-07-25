import mongoose from 'mongoose';

export const generateStringId = () => {
  return new mongoose.Types.ObjectId().toHexString();
};

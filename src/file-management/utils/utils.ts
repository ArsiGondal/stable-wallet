import { Types } from 'mongoose';

export const insertAt = (array, index, elements) => {
  array.splice(index, 0, elements);
};

export const isValidURL = (urlString) => {
  try {
    const url = new URL(urlString);
    return true;
  } catch (err) {
    return false;
  }
};

export const generateStringId = () => {
  return new Types.ObjectId().toHexString();
};

import mongoose from 'mongoose';
import { generateStringId } from 'src/utils/utils';

export const CoinSchema = new mongoose.Schema(
  {
    _id: { type: String, default: generateStringId },
    name: { type: String, unique: true },
    priceInUSD: { type: Number, default: 0 },
    priceInEUR: { type: Number, default: 0 },
    priceChangePercentage: { type: Number, default: 0 },
    chainID: { type: String },
    sparkLineIn7DofPrice: { type: Array },
    coinName: { type: String },
    imageURL: { type: String },
    isStakingAvailable: { type: Boolean, default: false },
    isSwapAvailable: { type: Boolean, default: false },
    isTradeAvailable: { type: Boolean, default: false },
    chainIDString: { type: String },
    isToken: { type: Boolean, default: false },
    contract: { type: String, default: '' },
    startDate: { type: Number },
    color: { type: String },
    sendText: { type: String },
    isGraphAvailable: {type:Boolean,default:true},
  },
  { collection: 'coin' },
);

mongoose.model('coin', CoinSchema);
CoinSchema.set('timestamps', true);
CoinSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    delete ret._id;
  },
});

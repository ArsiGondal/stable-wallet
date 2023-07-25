export interface Coin extends Document {
  id: string;
  name: string;
  priceInUSD: number;
  priceInEUR: number;
  priceChangePercentage: number;
  chainID: string;
  sparkLineIn7DofPrice: number[];
  coinName: string;
  imageURL: string;
  isStakingAvailable: boolean;
  isSwapAvailable: boolean;
  isTradeAvailable: boolean;
  chainIDString: string;
  isToken: boolean;
  contract: string;
  startDate: number;
  color: string;
  sendText: string;
  isGraphAvailable: boolean;
}

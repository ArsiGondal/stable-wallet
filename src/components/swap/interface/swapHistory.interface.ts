import { Document } from 'mongoose';

export interface SwapHistory extends Document {
  id: string;
  walletAddress: string;
  fromChainId: string;
  toChainId: string;
  bridgeFeeInSrcCoin: string;
  bridgeFeeInUSD: number;
  exchangedCoin: string;
  recievedCoin: string;
  exchangeAmount: number;
  recievedAmount: number;
  transactionHash: string;
  transactionURL: string;
  fromImageURL: string;
  toImageURL: string;
  date: number;
}

import { Document } from 'mongoose';

export interface BridgeFee extends Document {
  id: string;
  srcChainId: string;
  destChainId: string;
  bridgeFeeInEth: string;
  bridgeFeeInUSD: number;
}

import { Document } from 'mongoose';

export interface RpcCall extends Document {
    id: string;
    chainID: string;
    methodName: string;
    senderAddress: string;
    createdAt:Date;
    updatedAt:Date;
}

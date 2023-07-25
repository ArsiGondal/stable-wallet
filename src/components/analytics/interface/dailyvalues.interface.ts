import { Document } from "mongoose";

export interface DailyValues extends Document{
    id:string;
    newAddedAmount: number;
    dateTimestamp:number;
}
import { Document } from "mongoose";

export interface InvestorInAll extends Document{
    id:string;
    count: number;
    dateTimestamp:number;
}
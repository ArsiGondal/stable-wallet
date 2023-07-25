import { Document } from "mongoose";

export interface DailyUsers extends Document{
    id:string;
    newUsersCount: number;
    dateTimestamp:number;
}
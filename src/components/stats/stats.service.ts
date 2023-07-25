import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RpcCallDTO } from './dto/rpc-call.dto';
import { NetworkToChainID } from './enum/NetworkToChainID';
import { TimePeriodToDate } from './enum/timePeriodToDate';
import { RpcCall } from './interface/rpc-call.interface';

@Injectable()
export class StatsService {
    private ONE_DAY = 24 * 60 * 60 * 1000;
    private ONE_HOUR = 60 * 60 * 1000;
    constructor(@InjectModel('rpcCall') private _rpcCallModel: Model<RpcCall>) { }

    async methodCalled(rpcCallDto: RpcCallDTO) {
        try {
            return await new this._rpcCallModel(rpcCallDto).save();
        }
        catch (err) {
            console.log(err);
            throw new BadRequestException(err?.message);
        }
    }

    async getRpcData(startDate,endDate,network,timeperiod){
        try{
            console.log({timeperiod})
            startDate = parseInt(startDate);

            if(timeperiod){
                const time = TimePeriodToDate[timeperiod];
                startDate = Date.now() - time
            }

            console.log({network})
            const chainID = NetworkToChainID[network]
            console.log({chainID})

            let chainIDFilter = {};
            if(chainID){
                chainIDFilter = {chainID};
            }

            let endDateFilter = {createdAt:{$lte:new Date()}};
            if(parseInt(endDate)>0){
                endDate = parseInt(endDate)
                endDateFilter = {createdAt:{$lte:new Date(endDate)}};
            }
            const total = await this._rpcCallModel.countDocuments({ $and: [{ createdAt: { $gte: new Date(startDate) }, },endDateFilter], ...chainIDFilter });
            const eth_call = await this._rpcCallModel.countDocuments({ $and: [{ createdAt: { $gte: new Date(startDate) }, },endDateFilter], methodName: "eth_call", ...chainIDFilter });
            const eth_estimateGas = await this._rpcCallModel.countDocuments({ $and: [{ createdAt: { $gte: new Date(startDate) }, },endDateFilter], methodName: "eth_estimateGas", ...chainIDFilter });
            const eth_gasLimit = await this._rpcCallModel.countDocuments({ $and: [{ createdAt: { $gte: new Date(startDate) }, },endDateFilter], methodName: "eth_gasLimit", ...chainIDFilter });
            const eth_gasPrice = await this._rpcCallModel.countDocuments({ $and: [{ createdAt: { $gte: new Date(startDate) }, },endDateFilter], methodName: "eth_gasPrice", ...chainIDFilter });
            const eth_getBalance = await this._rpcCallModel.countDocuments({ $and: [{ createdAt: { $gte: new Date(startDate) }, },endDateFilter], methodName: "eth_getBalance", ...chainIDFilter });
            const eth_getBlock = await this._rpcCallModel.countDocuments({ $and: [{ createdAt: { $gte: new Date(startDate) }, },endDateFilter], methodName: "eth_getBlock", ...chainIDFilter });
            const eth_getTransactionCount = await this._rpcCallModel.countDocuments({ $and: [{ createdAt: { $gte: new Date(startDate) }, },endDateFilter], methodName: "eth_getTransactionCount", ...chainIDFilter });
            const eth_signTransaction = await this._rpcCallModel.countDocuments({ $and: [{ createdAt: { $gte: new Date(startDate) }, },endDateFilter], methodName: "eth_signTransaction", ...chainIDFilter });
            const eth_sendSignedTransaction = await this._rpcCallModel.countDocuments({ $and: [{ createdAt: { $gte: new Date(startDate) }, },endDateFilter], methodName: "eth_sendSignedTransaction", ...chainIDFilter });


            return {
                allData: {
                    total,
                    eth_call,
                    eth_estimateGas,
                    eth_gasLimit, 
                    eth_gasPrice, 
                    eth_getBalance, 
                    eth_getBlock, 
                    eth_getTransactionCount, 
                    eth_signTransaction,
                    eth_sendSignedTransaction,
                },
            }

        }
        catch(err){
            console.log(err);
            throw new BadRequestException(err?.message);
        }
    }
}

import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { verify } from 'jsonwebtoken';
import { Model } from 'mongoose';
import { Coin } from '../coins/interface/coin.interface';
import { TradeHistory } from './interface/Trade-history.interface';

@Injectable()
export class TradeService {
  constructor(
    @InjectModel('Trade') private tradeModel: Model<TradeHistory>,
    @InjectModel('Coin') private _coinModel: Model<Coin>,
  ) {}

  async tradeWebhook(data) {
    try {
      let decodedData: any = verify(
        data?.data,
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJBUElfS0VZIjoiM2YwZThmZjQtYjkyYS00ODIzLWExNjMtNjEzYTdiMWM5Y2EwIiwiaWF0IjoxNjkxMDY3MTczLCJleHAiOjE2OTE2NzE5NzN9.Z1YiPJLcjKplD-Cdr2dCfNB8_B9cpqyc9_6IOzaPgZo',
      );
      console.log('Webhook data is', decodedData);

      decodedData = JSON.parse(JSON.stringify(decodedData));

      const dataToSave: TradeHistory = {
        orderID: decodedData?.webhookData?.id,
        eventID: decodedData?.eventID,
        ...decodedData?.webhookData,
      };

      const coinData = await this._coinModel.findOne({
        coinName: dataToSave.cryptoCurrency,
      });

      delete dataToSave?.id;
      dataToSave.createdAtTimeStamp = new Date().getTime();
      dataToSave.coinImageURL = coinData.imageURL;

      const savedData = await this.tradeModel.updateOne(
        { orderID: dataToSave?.orderID },
        dataToSave,
        { upsert: true },
      );

      return savedData;
    } catch (err) {
      console.log(err);
      throw new BadRequestException(err?.message);
    }
  }

  async getTradeHistory(walletAddress, offset, limit) {
    try {
      offset = parseInt(offset) < 0 ? 0 : offset;
      limit = parseInt(limit) < 1 ? 10 : limit;

      const walletRegex = new RegExp(`^${walletAddress}$`, 'i');

      return await this.tradeModel
        .find({ walletAddress: walletRegex })
        .sort({ createdAt: -1 })
        .skip(parseInt(offset))
        .limit(parseInt(limit));
    } catch (err) {
      console.log(err);
      throw new BadRequestException(err?.message);
    }
  }

  async getTradeByOrderID(orderID) {
    try {
      return await this.tradeModel.findOne({ orderID: orderID });
    } catch (err) {
      console.log(err);
      throw new BadRequestException(err?.message);
    }
  }

  async getTradeByID(id) {
    try {
      return await this.tradeModel.findOne({ _id: id });
    } catch (err) {
      console.log(err);
      throw new BadRequestException(err?.message);
    }
  }

  async getLatestTrade(walletAddress) {
    const walletRegex = new RegExp(`^${walletAddress}$`, 'i');

    return await this.tradeModel
      .find({ walletAddress: walletRegex })
      .sort({ createdAt: -1 })
      .then((items) => items[0]);
  }
}

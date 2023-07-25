import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CoinDTO } from './dto/coin.dto';
import { Coin } from './interface/coin.interface';
import axios from 'axios';
const schedule = require('node-schedule');

@Injectable()
export class CoinService implements OnModuleInit {
  constructor(@InjectModel('Coin') private _coinModel: Model<Coin>) {}

  onModuleInit() {
    console.log('Coin Module Initialized');
    this.scheduleUpdateCoin();
  }

  private scheduleUpdateCoin() {
    schedule.scheduleJob('*/5 * * * *', () => {
      this.updateCoins();
    });
  }

  async addCoin(coinDto: CoinDTO) {
    return await new this._coinModel(coinDto).save();
  }

  getCoins() {
    return this._coinModel.aggregate([
      {
        $addFields: {
          id: '$_id',
        },
      },
      {
        $project: {
          _id: 0,
          sparkLineIn7DofPrice: 0,
          createdAt: 0,
          updatedAt: 0,
          __v: 0,
        },
      },
    ]);
  }

  async getCoinsWithSparkline() {
    return this._coinModel.aggregate([
      {
        $addFields: {
          id: '$_id',
        },
      },
      {
        $project: {
          _id: 0,
          createdAt: 0,
          updatedAt: 0,
          __v: 0,
        },
      },
    ]);
  }

  async getCoin(name) {
    const coin = await this._coinModel.aggregate([
      {
        $match: {
          name,
        },
      },
      {
        $addFields: {
          id: '$_id',
        },
      },
      {
        $project: {
          _id: 0,
          createdAt: 0,
          updatedAt: 0,
          __v: 0,
        },
      },
    ]);
    if (!coin) {
      throw new HttpException('No Coin found', HttpStatus.NOT_FOUND);
    }

    return coin[0];
  }

  async updateCoin(updateCoinDto, name) {
    try {
      await this._coinModel.updateOne({ name }, updateCoinDto);
      return { message: 'Coin updated Successfully!' };
    } catch (err) {
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }

  async updateCoins() {
    const coins = await this._coinModel.find();

    coins.forEach(async (coin) => {
      try {
        var res = await axios.get(
          `https://pro-api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${coin.name}&order=market_cap_desc&sparkline=true&x_cg_pro_api_key=${process.env.COINGECKO_API_KEY}`,
        );

        var res2 = await axios.get(
          `https://pro-api.coingecko.com/api/v3/coins/markets?vs_currency=eur&ids=${coin.name}&order=market_cap_desc&sparkline=false&x_cg_pro_api_key=${process.env.COINGECKO_API_KEY}`,
        );

        const data = res.data[0];

        const dataInEur = res2.data[0];

        await this._coinModel.updateOne(
          { name: coin.name },
          {
            priceInUSD: data.current_price,
            priceInEUR: dataInEur.current_price,
            priceChangePercentage: data.price_change_percentage_24h,
            sparkLineIn7DofPrice: data.sparkline_in_7d.price,
            // imageURL: data?.image,
          },
        );
      } catch (err) {
        console.log(err);
      }
    });

    return {};
  }

  async getCoinByChainID(chainID) {
    try {
      const coin = await this._coinModel.findOne({ chainID });
      if (!coin) {
        throw new HttpException(
          'Coin not found with this chain id',
          HttpStatus.NOT_FOUND,
        );
      }
      return coin;
    } catch (err) {
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }
}

import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Info } from './interface/info.interface';

@Injectable()
export class InfoService {
  constructor(@InjectModel('AppInfo') private _infoModel: Model<Info>) {}

  async updateInfo(infoDto) {
    try {
      await this._infoModel.updateOne({ _id: 'AppInfo' }, infoDto, {
        upsert: true,
      });
    } catch (err) {
      throw new HttpException(err.message, HttpStatus.BAD_REQUEST);
    }
  }

  async getInfo() {
    try {
      return await this._infoModel.findOne();
    } catch (err) {
      throw new HttpException(err.message, HttpStatus.BAD_REQUEST);
    }
  }
}

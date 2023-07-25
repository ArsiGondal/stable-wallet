import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import axios from 'axios';
import { Model } from 'mongoose';
import { catchError } from 'rxjs';
import { stableFundChainIDToAddress } from 'src/config/rpc';
const Web3 = require('web3');
import { User } from '../users/interface/user.interface';
import { BUSDABI, TokenInfo } from '../wallet/data/TokenStaking';
import { Wallet } from '../wallet/interface/wallet.interface';
import { FundStatus } from './enum/funded.enum';
import { InvestmentNetwork } from './enum/investmentNetwork.enum';
import { Network } from './enum/network.enum';
import { Count } from './interface/count.interface';
import { DailyCompunded } from './interface/dailyCompunded';
import { DailyFunded } from './interface/dailyFunded.interface';
import { DailyFundedUser } from './interface/dailyFundedUser.interface';
import { DailyInvestment } from './interface/dailyInvestment.interface';
import { DailyUsers } from './interface/dailyusers.interface';
import { DailyValues } from './interface/dailyvalues.interface';
const schedule = require('node-schedule');

@Injectable()
export class AnalyticsService implements OnModuleInit {
  private web3;
  private ONE_DAY = 24 * 60 * 60 * 1000;
  private web3Instances = {};
  private contractInstances = {};
  private tokenContractInstances = {};
  constructor(
    @InjectModel('dailyusers') private _dailyUserModel: Model<DailyUsers>,
    @InjectModel('User') private _userModel: Model<User>,
    @InjectModel('Wallet') private _walletModel: Model<Wallet>,
    @InjectModel('dailyValuesCount')
    private _dailyValuesModel: Model<DailyValues>,
    @InjectModel('dailyInvestment')
    private _dailyInvestmentModel: Model<DailyInvestment>,
    @InjectModel('dailyFunded')
    private _dailyFundedModel: Model<DailyFunded>,
    @InjectModel('dailyFundedUser')
    private _dailyFundedUserModel: Model<DailyFundedUser>,
    @InjectModel('dailyCompunded')
    private _dailyCompundedModel: Model<DailyCompunded>,
    @InjectModel('Count')
    private _countModel: Model<Count>,
  ) {
    this.web3 = new Web3(process.env.POLYGON_RPC);
    this.initializeWeb3();
  }

  onModuleInit() {
    let londonHours = 1;
    let londonMinutes = 0;
    let date = new Date();
    date.setUTCHours(londonHours - 1);
    date.setUTCMinutes(londonMinutes);

    this.scheduleUpdateCoin(date);
  }

  private scheduleUpdateCoin(date) {
    schedule.scheduleJob(
      { hour: date.getHours(), minute: date.getMinutes() },
      () => {
        let startDate = new Date().getTime();
        this.getUsersCount(startDate - this.ONE_DAY);
        this.updateAllInvestmentsFrom(startDate - this.ONE_DAY);
        this.updateDailyNewAmountFunded(startDate - this.ONE_DAY);
      },
    );
  }

  async initializeWeb3() {
    const chainIds = await Object.keys(TokenInfo);
    for await (const chainId of chainIds) {
      if (TokenInfo[chainId]?.contractAddress) {
        const rpcUrl = TokenInfo[chainId]?.rpc;
        const web3 = new Web3(rpcUrl);
        this.web3Instances[chainId] = web3;
        this.contractInstances[chainId] = new web3.eth.Contract(
          TokenInfo[chainId]?.abi,
          TokenInfo[chainId]?.contractAddress,
        );

        if (TokenInfo[chainId]?.BUSDTokenAddress) {
          this.tokenContractInstances[chainId] = new web3.eth.Contract(
            BUSDABI,
            TokenInfo[chainId]?.BUSDTokenAddress,
          );
        }
      }
    }
  }

  async getUsersCount(date) {
    try {
      const startDate = Math.floor(date / this.ONE_DAY) * this.ONE_DAY;
      const count = await this._userModel.countDocuments({
        $and: [
          { createdAt: { $gte: new Date(startDate) } },
          { createdAt: { $lt: new Date(startDate + this.ONE_DAY) } },
        ],
        email: { $ne: '' },
        phoneNumber: { $ne: '' },
      });
      await this._dailyUserModel.updateOne(
        { dateTimestamp: startDate },
        { $set: { newUsersCount: count, dateTimestamp: startDate } },
        { upsert: true },
      );

      return await this._dailyUserModel.findOne({ dateTimestamp: startDate });
    } catch (err) {
      console.log(err);
      throw new BadRequestException(err?.message);
    }
  }

  async getAllCountsFrom(date) {
    try {
      const startDate = Math.floor(date / this.ONE_DAY) * this.ONE_DAY;
      const todayDate =
        Math.floor(new Date().getTime() / this.ONE_DAY) * this.ONE_DAY;

      for (let i = startDate; i <= todayDate; i += this.ONE_DAY) {
        await this.getUsersCount(i);
      }
    } catch (err) {
      console.log(err);
      throw new BadRequestException(err?.message);
    }
  }

  async getCountsFrom(date) {
    try {
      const startDate = Math.floor(date / this.ONE_DAY) * this.ONE_DAY;

      const totalSignUps = await this._userModel.countDocuments({
        email: { $ne: '' },
        phoneNumber: { $ne: '' },
        isVerified: true,
      });

      const data = await this._dailyUserModel.find({
        dateTimestamp: { $gte: startDate },
      });

      return { totalSignUps, data };
    } catch (err) {
      console.log(err);
      throw new BadRequestException(err?.message);
    }
  }

  async getUserWhoInvestedInAll() {
    try {
      const count = await this._userModel.countDocuments({
        'userInfo.maticStaking': { $gt: 0 },
        'userInfo.busdStaking': { $gt: 0 },
        'userInfo.bnbStaking': { $gt: 0 },
      });

      return {
        count,
      };
    } catch (err) {
      console.log(err);
      throw new BadRequestException(err?.message);
    }
  }

  async getAndUpdateUserData() {
    try {
      const startDate =
        Math.floor(new Date().getTime() / this.ONE_DAY) * this.ONE_DAY;

      const users = await this._userModel.find({ email: { $ne: '' } });
      let count = 0;
      for (let userItem of users) {
        const userData = {
          maticStaking: 0,
          busdStaking: 0,
          bnbStaking: 0,
          maticBalance: 0,
          busdBalance: 0,
          bnbBalance: 0,
        };
        const wallets: any = await this._walletModel.find({
          userID: userItem?.id,
        });

        for (let walletItem of wallets) {
          const [
            maticStaking,
            busdStaking,
            bnbStaking,
            maticBalance,
            busdBalance,
            bnbBalance,
          ] = await Promise.all([
            this.getStaking(walletItem?.walletAddress, '137'),
            this.getStaking(walletItem?.walletAddress, '56 BUSD'),
            this.getStaking(walletItem?.walletAddress, '56'),
            this.getBalance(walletItem?.walletAddress, '137'),
            this.getBalance(walletItem?.walletAddress, '56 BUSD'),
            this.getBalance(walletItem?.walletAddress, '56'),
          ]);

          userData.maticStaking += maticStaking;
          userData.busdStaking += busdStaking;
          userData.bnbStaking += bnbStaking;

          userData.maticBalance += maticBalance;
          userData.busdBalance += busdBalance;
          userData.bnbBalance += bnbBalance;
        }

        await this._userModel.updateOne(
          { _id: userItem?.id },
          { userInfo: userData },
        );

        count++;
        console.log(`${count} done`);
      }
    } catch (err) {
      console.log(err);
      throw new BadRequestException(err);
    }
  }

  async getStaking(address, chainID) {
    try {
      const oldContracts = ['137'];

      if (oldContracts?.includes(chainID)) {
        const ownedDeposits = await this.contractInstances[chainID].methods
          .getOwnedDeposits(address)
          .call();

        let totalStake = 0;
        for await (let depositID of ownedDeposits) {
          const depositData = await this.contractInstances[chainID].methods
            .depositState(depositID)
            .call();
          const stakeInEth = parseFloat(
            this.web3Instances[chainID].utils.fromWei(
              depositData.depositAmount,
              'ether',
            ),
          );
          totalStake += stakeInEth;
        }

        console.log('totalStake in matic', totalStake);

        return totalStake;
      } else {
        const investorData = await this.contractInstances[chainID].methods
          .investors(address)
          .call();

        const stakeInEth = parseFloat(
          this.web3Instances[chainID].utils.fromWei(
            investorData.totalLocked,
            'ether',
          ),
        );

        console.log('totalStake in BUSD', stakeInEth);

        return stakeInEth;
      }
    } catch (err) {
      console.log(err);
      throw new Error(err?.message);
    }
  }

  async getBalance(address, chainID) {
    try {
      if (TokenInfo[chainID]) {
        if (TokenInfo[chainID]?.BUSDBUSDTokenAddress) {
          const balanceInWei = await this.tokenContractInstances[
            chainID
          ].methods
            .balanceOf(address)
            .call();

          const balanceInEth = parseFloat(
            this.web3Instances[chainID].utils.fromWei(balanceInWei, 'ether'),
          );

          return balanceInEth;
        } else {
          const balanceInWei = await this.web3Instances[chainID].eth.getBalance(
            address,
          );
          const balanceInEth = parseFloat(
            this.web3Instances[chainID].utils.fromWei(balanceInWei, 'ether'),
          );

          return balanceInEth;
        }
      }
    } catch (err) {
      console.log(err);
      throw new Error(err?.message);
    }
  }

  async getTransactions(address, startDate, endDate) {
    try {
      let data = [];
      let cursor = null;
      do {
        const cursorUrl = cursor ? `cursor=${cursor}` : ``;
        const res = await axios.get(
          `https://deep-index.moralis.io/api/v2/0xa5C5591018dfE29365e7e80c70b76ADf611c1bEC?chain=polygon&from_date=${startDate}&to_date=${endDate}&${cursorUrl}`,
          {
            headers: {
              'x-api-key':
                '1MWbp55yVk06vh5l81gUTYLHfmIQ9BBycudpuifR8fYk50OEzIEeeP6cmRL0IT8H',
            },
          },
        );

        debugger;
      } while (cursor);
    } catch (err) {
      console.log(err);
      throw new BadRequestException(err?.message);
    }
  }

  async getUsersForTable(
    //
    offset,
    limit,
    network: string,
    fundQuery: string,
    startDate: number,
    endDate: number,
  ) {
    try {
      startDate = parseInt(startDate?.toString());
      endDate = parseInt(endDate?.toString());
      if (startDate > endDate) {
        startDate = 0;
      }
      let networkFilter = {};
      let sortFilter = {};
      let fundStatus = {};
      let fundValue = fundQuery == FundStatus.funded ? true : false;
      switch (network) {
        case Network.matic:
          networkFilter = {
            ...networkFilter,
            maticFunded: {
              $cond: {
                if: { $gt: ['$userInfo.maticBalance', 0] },
                then: true,
                else: false,
              },
            },
          };
          if (fundStatus != FundStatus.all) {
            fundStatus = {
              ...fundStatus,
              maticFunded: fundValue,
            };
          }
          sortFilter = {
            ...sortFilter,
            maticFunded: -1,
          };
          break;

        case Network.busd:
          networkFilter = {
            ...networkFilter,
            busdFunded: {
              $cond: {
                if: { $gt: ['$userInfo.busdBalance', 0] },
                then: true,
                else: false,
              },
            },
          };
          if (fundStatus != FundStatus.all) {
            fundStatus = {
              ...fundStatus,
              busdFunded: fundValue,
            };
          }

          sortFilter = {
            ...sortFilter,
            busdFunded: -1,
          };
          break;

        case Network.bnb:
          networkFilter = {
            ...networkFilter,
            bnbFunded: {
              $cond: {
                if: { $gt: ['$userInfo.bnbBalance', 0] },
                then: true,
                else: false,
              },
            },
          };
          if (fundStatus != FundStatus.all) {
            fundStatus = {
              ...fundStatus,
              bnbFunded: fundValue,
            };
          }
          sortFilter = {
            ...sortFilter,
            bnbFunded: -1,
          };
          break;

        default:
          networkFilter = {
            ...networkFilter,
            maticFunded: {
              $cond: {
                if: { $gt: ['$userInfo.maticBalance', 0] },
                then: true,
                else: false,
              },
            },
            busdFunded: {
              $cond: {
                if: { $gt: ['$userInfo.busdBalance', 0] },
                then: true,
                else: false,
              },
            },
            bnbFunded: {
              $cond: {
                if: { $gt: ['$userInfo.bnbBalance', 0] },
                then: true,
                else: false,
              },
            },
          };
          sortFilter = {
            ...sortFilter,
            maticFunded: -1,
            busdFunded: -1,
            bnbFunded: -1,
          };
          if (fundStatus != FundStatus.all) {
            fundStatus = {
              ...fundStatus,
              maticFunded: fundValue,
              busdFunded: fundValue,
              bnbFunded: fundValue,
            };
          }
          break;
      }
      offset = parseInt(offset) < 0 ? 0 : offset;
      limit = parseInt(limit) < 1 ? 10 : limit;

      let totalCount = await this._userModel.aggregate([
        {
          $match: {
            $and: [
              { createdAt: { $gte: new Date(startDate) } },
              { createdAt: { $lte: new Date(endDate) } },
            ],
          },
        },
        {
          $addFields: {
            maticFunded: {
              $cond: {
                if: { $gt: ['$userInfo.maticBalance', 0] },
                then: true,
                else: false,
              },
            },
            busdFunded: {
              $cond: {
                if: { $gt: ['$userInfo.busdBalance', 0] },
                then: true,
                else: false,
              },
            },
            bnbFunded: {
              $cond: {
                if: { $gt: ['$userInfo.bnbBalance', 0] },
                then: true,
                else: false,
              },
            },
          },
        },
        {
          $match: {
            ...fundStatus,
          },
        },
        {
          $count: 'totalCount',
        },
      ]);

      let totalMatic = await this._userModel.aggregate([
        {
          $match: {
            $and: [
              { createdAt: { $gte: new Date(startDate) } },
              { createdAt: { $lte: new Date(endDate) } },
            ],
          },
        },
        {
          $addFields: {
            maticFunded: {
              $cond: {
                if: { $gt: ['$userInfo.maticBalance', 0] },
                then: true,
                else: false,
              },
            },
          },
        },
        {
          $match: {
            maticFunded: fundValue,
          },
        },
        {
          $count: 'totalMatic',
        },
      ]);

      let totalBnb = await this._userModel.aggregate([
        {
          $match: {
            $and: [
              { createdAt: { $gte: new Date(startDate) } },
              { createdAt: { $lte: new Date(endDate) } },
            ],
          },
        },
        {
          $addFields: {
            bnbFunded: {
              $cond: {
                if: { $gt: ['$userInfo.bnbBalance', 0] },
                then: true,
                else: false,
              },
            },
          },
        },
        {
          $match: {
            bnbFunded: fundValue,
          },
        },
        {
          $count: 'totalBnb',
        },
      ]);

      let totalBusd = await this._userModel.aggregate([
        {
          $match: {
            $and: [
              { createdAt: { $gte: new Date(startDate) } },
              { createdAt: { $lte: new Date(endDate) } },
            ],
          },
        },
        {
          $addFields: {
            busdFunded: {
              $cond: {
                if: { $gt: ['$userInfo.busdBalance', 0] },
                then: true,
                else: false,
              },
            },
          },
        },
        {
          $match: {
            busdFunded: fundValue,
          },
        },
        {
          $count: 'totalBusd',
        },
      ]);

      const data = await this._userModel.aggregate([
        {
          $match: {
            $and: [
              { createdAt: { $gte: new Date(startDate) } },
              { createdAt: { $lte: new Date(endDate) } },
            ],
          },
        },
        {
          $addFields: {
            maticFunded: {
              $cond: {
                if: { $gt: ['$userInfo.maticBalance', 0] },
                then: true,
                else: false,
              },
            },
            busdFunded: {
              $cond: {
                if: { $gt: ['$userInfo.busdBalance', 0] },
                then: true,
                else: false,
              },
            },
            bnbFunded: {
              $cond: {
                if: { $gt: ['$userInfo.bnbBalance', 0] },
                then: true,
                else: false,
              },
            },
          },
        },
        {
          $match: {
            ...fundStatus,
          },
        },
        {
          $sort: {
            ...sortFilter,
          },
        },
        {
          $skip: parseInt(offset),
        },
        {
          $limit: parseInt(limit),
        },
      ]);

      return {
        totalCount: totalCount?.length > 0 ? totalCount[0].totalCount : 0,
        totalMatic: totalMatic?.length > 0 ? totalMatic[0].totalMatic : 0,
        totalBnb: totalBnb?.length > 0 ? totalBnb[0].totalBnb : 0,
        totalBusd: totalBusd?.length > 0 ? totalBusd[0].totalBusd : 0,
        data: data,
      };
    } catch (err) {
      console.log(err);
      throw new BadRequestException(err?.message);
    }
  }

  async getStakingUsersForTable(
    //
    offset,
    limit,
    network: string,
    fundQuery: string,
    startDate: number,
    endDate: number,
  ) {
    try {
      startDate = parseInt(startDate?.toString());
      endDate = parseInt(endDate?.toString());
      if (startDate > endDate) {
        startDate = 0;
      }
      let networkFilter = {};
      let sortFilter = {};
      let fundStatus = {};
      let fundValue = fundQuery == FundStatus.funded ? true : false;
      switch (network) {
        case Network.matic:
          networkFilter = {
            ...networkFilter,
            maticStatus: {
              $cond: {
                if: { $gt: ['$userInfo.maticStaking', 0] },
                then: true,
                else: false,
              },
            },
          };
          if (fundStatus != FundStatus.all) {
            fundStatus = {
              ...fundStatus,
              maticStatus: fundValue,
            };
          }
          sortFilter = {
            ...sortFilter,
            maticStatus: -1,
          };
          break;

        case Network.busd:
          networkFilter = {
            ...networkFilter,
            busdStatus: {
              $cond: {
                if: { $gt: ['$userInfo.busdStaking', 0] },
                then: true,
                else: false,
              },
            },
          };
          if (fundStatus != FundStatus.all) {
            fundStatus = {
              ...fundStatus,
              busdStatus: fundValue,
            };
          }

          sortFilter = {
            ...sortFilter,
            busdStatus: -1,
          };
          break;

        case Network.bnb:
          networkFilter = {
            ...networkFilter,
            bnbStatus: {
              $cond: {
                if: { $gt: ['$userInfo.bnbStaking', 0] },
                then: true,
                else: false,
              },
            },
          };
          if (fundStatus != FundStatus.all) {
            fundStatus = {
              ...fundStatus,
              bnbStatus: fundValue,
            };
          }
          sortFilter = {
            ...sortFilter,
            bnbStatus: -1,
          };
          break;

        default:
          networkFilter = {
            ...networkFilter,
            maticStatus: {
              $cond: {
                if: { $gt: ['$userInfo.maticStaking', 0] },
                then: true,
                else: false,
              },
            },
            busdStatus: {
              $cond: {
                if: { $gt: ['$userInfo.busdStaking', 0] },
                then: true,
                else: false,
              },
            },
            bnbStatus: {
              $cond: {
                if: { $gt: ['$userInfo.bnbStaking', 0] },
                then: true,
                else: false,
              },
            },
          };
          sortFilter = {
            ...sortFilter,
            maticStatus: -1,
            busdStatus: -1,
            bnbStatus: -1,
          };
          if (fundStatus != FundStatus.all) {
            fundStatus = {
              ...fundStatus,
              maticStatus: fundValue,
              busdStatus: fundValue,
              bnbStatus: fundValue,
            };
          }
          break;
      }
      offset = parseInt(offset) < 0 ? 0 : offset;
      limit = parseInt(limit) < 1 ? 10 : limit;

      let totalCount = await this._userModel.aggregate([
        {
          $match: {
            $and: [
              { createdAt: { $gte: new Date(startDate) } },
              { createdAt: { $lte: new Date(endDate) } },
            ],
          },
        },
        {
          $addFields: {
            maticStatus: {
              $cond: {
                if: { $gt: ['$userInfo.maticStaking', 0] },
                then: true,
                else: false,
              },
            },
            busdStatus: {
              $cond: {
                if: { $gt: ['$userInfo.busdStaking', 0] },
                then: true,
                else: false,
              },
            },
            bnbStatus: {
              $cond: {
                if: { $gt: ['$userInfo.bnbStaking', 0] },
                then: true,
                else: false,
              },
            },
          },
        },
        {
          $match: {
            ...fundStatus,
          },
        },
        {
          $count: 'totalCount',
        },
      ]);

      let totalMatic = await this._userModel.aggregate([
        {
          $match: {
            $and: [
              { createdAt: { $gte: new Date(startDate) } },
              { createdAt: { $lte: new Date(endDate) } },
            ],
          },
        },
        {
          $addFields: {
            maticStatus: {
              $cond: {
                if: { $gt: ['$userInfo.maticStaking', 0] },
                then: true,
                else: false,
              },
            },
          },
        },
        {
          $match: {
            maticStatus: fundValue,
          },
        },
        {
          $count: 'totalMatic',
        },
      ]);

      let totalBnb = await this._userModel.aggregate([
        {
          $match: {
            $and: [
              { createdAt: { $gte: new Date(startDate) } },
              { createdAt: { $lte: new Date(endDate) } },
            ],
          },
        },
        {
          $addFields: {
            bnbStatus: {
              $cond: {
                if: { $gt: ['$userInfo.bnbStaking', 0] },
                then: true,
                else: false,
              },
            },
          },
        },
        {
          $match: {
            bnbStatus: fundValue,
          },
        },
        {
          $count: 'totalBnb',
        },
      ]);

      let totalBusd = await this._userModel.aggregate([
        {
          $match: {
            $and: [
              { createdAt: { $gte: new Date(startDate) } },
              { createdAt: { $lte: new Date(endDate) } },
            ],
          },
        },
        {
          $addFields: {
            busdStatus: {
              $cond: {
                if: { $gt: ['$userInfo.busdStaking', 0] },
                then: true,
                else: false,
              },
            },
          },
        },
        {
          $match: {
            busdStatus: fundValue,
          },
        },
        {
          $count: 'totalBusd',
        },
      ]);

      const data = await this._userModel.aggregate([
        {
          $match: {
            $and: [
              { createdAt: { $gte: new Date(startDate) } },
              { createdAt: { $lte: new Date(endDate) } },
            ],
          },
        },
        {
          $addFields: {
            maticStatus: {
              $cond: {
                if: { $gt: ['$userInfo.maticStaking', 0] },
                then: true,
                else: false,
              },
            },
            busdStatus: {
              $cond: {
                if: { $gt: ['$userInfo.busdStaking', 0] },
                then: true,
                else: false,
              },
            },
            bnbStatus: {
              $cond: {
                if: { $gt: ['$userInfo.bnbStaking', 0] },
                then: true,
                else: false,
              },
            },
          },
        },
        {
          $match: {
            ...fundStatus,
          },
        },
        {
          $sort: {
            ...sortFilter,
          },
        },
        {
          $skip: parseInt(offset),
        },
        {
          $limit: parseInt(limit),
        },
      ]);

      return {
        totalCount: totalCount?.length > 0 ? totalCount[0].totalCount : 0,
        totalMatic: totalMatic?.length > 0 ? totalMatic[0].totalMatic : 0,
        totalBnb: totalBnb?.length > 0 ? totalBnb[0].totalBnb : 0,
        totalBusd: totalBusd?.length > 0 ? totalBusd[0].totalBusd : 0,
        data: data,
      };
    } catch (err) {
      console.log(err);
      throw new BadRequestException(err?.message);
    }
  }

  async updateUserData(userID) {
    try {
      const startDate =
        Math.floor(new Date().getTime() / this.ONE_DAY) * this.ONE_DAY;

      let count = 0;
      const userData = {
        maticStaking: 0,
        busdStaking: 0,
        bnbStaking: 0,
        maticBalance: 0,
        busdBalance: 0,
        bnbBalance: 0,
      };
      const wallets: any = await this._walletModel.find({
        userID: userID,
      });

      for (let walletItem of wallets) {
        const [
          maticStaking,
          busdStaking,
          bnbStaking,
          maticBalance,
          busdBalance,
          bnbBalance,
        ] = await Promise.all([
          this.getStaking(walletItem?.walletAddress, '137'),
          this.getStaking(walletItem?.walletAddress, '56 BUSD'),
          this.getStaking(walletItem?.walletAddress, '56'),
          this.getBalance(walletItem?.walletAddress, '137'),
          this.getBalance(walletItem?.walletAddress, '56 BUSD'),
          this.getBalance(walletItem?.walletAddress, '56'),
        ]);

        userData.maticStaking += maticStaking;
        userData.busdStaking += busdStaking;
        userData.bnbStaking += bnbStaking;

        userData.maticBalance += maticBalance;
        userData.busdBalance += busdBalance;
        userData.bnbBalance += bnbBalance;
      }

      await this._userModel.updateOne({ _id: userID }, { userInfo: userData });

      count++;
      console.log(`${count} done`);
    } catch (err) {
      console.log(err);
      throw new BadRequestException(err);
    }
  }

  async getTotalInvestmentData(date, network) {
    try {
      const startDate = Math.floor(date / this.ONE_DAY) * this.ONE_DAY;

      return await this._dailyInvestmentModel.find({
        dateTimestamp: { $gte: startDate },
        network: network,
      });
    } catch (err) {
      throw new HttpException(err.message, HttpStatus.BAD_REQUEST);
    }
  }

  async updateInvestmentDataForOneDay(startDate, network) {
    try {
      let address = '';
      let chain = '';

      startDate = Math.floor(startDate / this.ONE_DAY) * this.ONE_DAY;
      let endDate = startDate + this.ONE_DAY;

      switch (network) {
        case InvestmentNetwork.matic:
          address = stableFundChainIDToAddress['137'].contract;
          chain = 'polygon';
          break;
        case InvestmentNetwork.bnb:
          address = stableFundChainIDToAddress['56'].contract;
          chain = 'bsc';
          break;
        case InvestmentNetwork.busd:
          address = stableFundChainIDToAddress['56 BUSD'].contract;
          chain = 'bsc';
          break;
      }

      let cursor = null;
      let res;
      let totalInvestment = 0;
      let totalInvestor = 0;

      let moralisStartDate = startDate / 1000;
      let moralisEndDate = endDate / 1000;

      let data = [];
      let DEPOSIT_INPUT = { input: '0xd0e30db0' };
      if (network == InvestmentNetwork.busd) {
        DEPOSIT_INPUT = { input: '0xb6b55f25' };
      }
      do {
        const cursorUrl = cursor ? `cursor=${cursor}` : ``;

        res = await axios.get(
          `https://deep-index.moralis.io/api/v2/${address}?chain=${chain}&from_date=${moralisStartDate}&to_date=${moralisEndDate}&${cursorUrl}`,
          {
            headers: {
              'x-api-key':
                '1MWbp55yVk06vh5l81gUTYLHfmIQ9BBycudpuifR8fYk50OEzIEeeP6cmRL0IT8H',
            },
          },
        );

        data.push(...res?.data?.result);
        cursor = res.data.cursor;
      } while (cursor);

      data.forEach((el) => {
        if (el?.input?.slice(0, 10) == DEPOSIT_INPUT?.input) {
          let elValue = el?.value;
          if (network == InvestmentNetwork.busd) {
            elValue = this.web3.utils.hexToNumberString(
              `0x${el.input.slice(-17)}`,
            );
          }

          totalInvestment += Number(this.web3.utils.fromWei(elValue));

          totalInvestor += 1;
        }
      });
      await this._dailyInvestmentModel.updateOne(
        { dateTimestamp: startDate, network: network },
        {
          $set: {
            totalInvestment,
            totalInvestor,
            network,
            dateTimestamp: startDate,
          },
        },
        { upsert: true },
      );

      return await this._dailyInvestmentModel.findOne({
        dateTimestamp: startDate,
      });
    } catch (err) {
      throw new HttpException(err.message, HttpStatus.BAD_REQUEST);
    }
  }

  async updateAllInvestmentsFrom(date) {
    try {
      const startDate = Math.floor(date / this.ONE_DAY) * this.ONE_DAY;
      const todayDate =
        Math.floor(new Date().getTime() / this.ONE_DAY) * this.ONE_DAY;

      let networks = [
        InvestmentNetwork.matic,
        InvestmentNetwork.bnb,
        InvestmentNetwork.busd,
      ];

      for (let j = 0; j < networks.length; j++) {
        for (let i = startDate; i <= todayDate; i += this.ONE_DAY) {
          await this.updateInvestmentDataForOneDay(i, networks[j]);
        }
      }
    } catch (err) {
      console.log(err);
      throw new BadRequestException(err?.message);
    }
  }

  async getDailyNewAmountFunded(startDate, network, address) {
    try {
      let chain = '';
      let apiKey = '';
      let apiUrl = '';
      let contractAddress = '';

      startDate = Math.floor(startDate / this.ONE_DAY) * this.ONE_DAY;
      let endDate = startDate + this.ONE_DAY;

      switch (network) {
        case InvestmentNetwork.matic:
          chain = 'polygon';
          apiKey = process.env.POLYGON_KEY;
          apiUrl = process.env.POLYGON_API_URL;
          contractAddress = stableFundChainIDToAddress['137'].contract;
          break;
        case InvestmentNetwork.bnb:
          chain = 'bsc';
          apiKey = process.env.BSC_KEY;
          apiUrl = process.env.BSC_API_URL;
          contractAddress = stableFundChainIDToAddress['56'].contract;
          break;
        case InvestmentNetwork.busd:
          chain = 'bsc';
          contractAddress = stableFundChainIDToAddress['56 BUSD'].contract;
          break;
      }

      let newFundedAmount = 0;

      let cursor = null;
      let res;
      let res2;

      let moralisStartDate = startDate / 1000;
      let moralisEndDate = endDate / 1000;

      debugger;

      if (network == InvestmentNetwork.busd) {
        let data = [];
        do {
          const cursorUrl = cursor ? `cursor=${cursor}` : ``;

          res = await axios.get(
            `https://deep-index.moralis.io/api/v2/${address}/erc20/transfers?chain=${chain}&from_date=${moralisStartDate}&to_date=${moralisEndDate}&${cursorUrl}`,
            {
              headers: {
                'x-api-key':
                  '1MWbp55yVk06vh5l81gUTYLHfmIQ9BBycudpuifR8fYk50OEzIEeeP6cmRL0IT8H',
              },
            },
          );

          debugger;

          data.push(...res?.data?.result);
          cursor = res.data.cursor;
        } while (cursor);

        data
          .filter((el) => {
            if (
              el?.to_address == address &&
              el?.address == TokenInfo['56 BUSD'].BUSDTokenAddress &&
              el?.from_address != contractAddress
            ) {
              return true;
            } else {
              return false;
            }
          })
          .forEach((el) => {
            newFundedAmount += Number(this.web3.utils.fromWei(el.value));
          });
      } else {
        let data = [];

        do {
          const cursorUrl = cursor ? `cursor=${cursor}` : ``;

          res = await axios.get(
            `https://deep-index.moralis.io/api/v2/${address}?chain=${chain}&from_date=${moralisStartDate}&to_date=${moralisEndDate}&${cursorUrl}`,
            {
              headers: {
                'x-api-key':
                  '1MWbp55yVk06vh5l81gUTYLHfmIQ9BBycudpuifR8fYk50OEzIEeeP6cmRL0IT8H',
              },
            },
          );

          debugger;

          data.push(...res?.data?.result);
          cursor = res.data.cursor;
        } while (cursor);

        data
          .filter((el) => {
            if (el?.input == '0x' && el?.to_address == address) {
              return true;
            } else {
              return false;
            }
          })
          .forEach((el) => {
            newFundedAmount += Number(this.web3.utils.fromWei(el.value));
          });

        res2 = await axios.get(
          `${apiUrl}?module=account&action=txlistinternal&address=${address}&sort=desc&apikey=${apiKey}`,
        );

        for (let i = 0; i < res.data.result.length; i++) {
          let timestamp =
            Math.floor(
              (parseInt(res.data.result[i].timeStamp) * 1000) / this.ONE_DAY,
            ) * this.ONE_DAY;

          console.log(timestamp);

          if (timestamp < startDate) {
            break;
          }

          if (
            res.data.result[i].to == address &&
            res.data.result[i].from != contractAddress
          ) {
            newFundedAmount += Number(
              this.web3.utils.fromWei(res.data.result[i].value),
            );
          }
        }
      }

      return newFundedAmount;
    } catch (err) {
      console.log(err);
      throw new HttpException(err.message, HttpStatus.BAD_REQUEST);
    }
  }

  async updateDailyNewAmountFunded(startDate) {
    try {
      startDate = Math.floor(startDate / this.ONE_DAY) * this.ONE_DAY;

      let totalBnb = 0,
        totalBusd = 0,
        totalMatic = 0;

      const users = await this._userModel.find({ email: { $ne: '' } });
      let count = 0;
      for (let userItem of users) {
        const userData = {
          matic: 0,
          busd: 0,
          bnb: 0,
        };
        const wallets: any = await this._walletModel.find({
          userID: userItem?.id,
        });

        for (let walletItem of wallets) {
          const [matic, busd, bnb] = await Promise.all([
            this.getDailyNewAmountFunded(
              startDate,
              InvestmentNetwork.matic,
              walletItem?.walletAddress,
            ),
            this.getDailyNewAmountFunded(
              startDate,
              InvestmentNetwork.busd,
              walletItem?.walletAddress,
            ),
            this.getDailyNewAmountFunded(
              startDate,
              InvestmentNetwork.bnb,
              walletItem?.walletAddress,
            ),
          ]);

          userData.matic += matic;
          userData.busd += busd;
          userData.bnb += bnb;
          totalMatic += matic;
          totalBnb += bnb;
          totalBusd += busd;
        }

        await new this._dailyFundedUserModel({
          amountFunded: userData,
          userID: userItem?.id,
          dateTimestamp: startDate,
        }).save();

        count++;
        console.log(`${count} done`);
      }

      await this._dailyFundedModel.updateOne(
        { dateTimestamp: startDate, network: InvestmentNetwork.matic },
        {
          $set: {
            amountFunded: totalMatic,
            network: InvestmentNetwork.matic,
            dateTimestamp: startDate,
          },
        },
        { upsert: true },
      );

      await this._dailyFundedModel.updateOne(
        { dateTimestamp: startDate, network: InvestmentNetwork.busd },
        {
          $set: {
            amountFunded: totalBusd,
            network: InvestmentNetwork.busd,
            dateTimestamp: startDate,
          },
        },
        { upsert: true },
      );

      await this._dailyFundedModel.updateOne(
        { dateTimestamp: startDate, network: InvestmentNetwork.bnb },
        {
          $set: {
            amountFunded: totalBnb,
            network: InvestmentNetwork.bnb,
            dateTimestamp: startDate,
          },
        },
        { upsert: true },
      );
    } catch (err) {
      console.log(err);
      throw new BadRequestException(err);
    }
  }

  async getUserTableForDailyFunded(
    offset,
    limit,
    network: string,
    fundQuery: string,
    startDate: number,
  ) {
    try {
      startDate = parseInt(startDate?.toString());

      if (startDate == 0) {
        startDate = Date.now();
      }

      startDate = Math.floor(startDate / this.ONE_DAY) * this.ONE_DAY;
      let endDate = startDate + this.ONE_DAY;

      let networkFilter = {};
      let sortFilter = {};
      let fundStatus = {};
      let fundValue = fundQuery == FundStatus.funded ? true : false;
      switch (network) {
        case Network.matic:
          networkFilter = {
            ...networkFilter,
            maticFunded: {
              $cond: {
                if: { $gt: ['$user.userInfo.matic', 0] },
                then: true,
                else: false,
              },
            },
          };
          if (fundStatus != FundStatus.all) {
            fundStatus = {
              ...fundStatus,
              'user.maticFunded': fundValue,
            };
          }
          sortFilter = {
            ...sortFilter,
            'user.maticFunded': -1,
          };
          break;

        case Network.busd:
          networkFilter = {
            ...networkFilter,
            busdFunded: {
              $cond: {
                if: { $gt: ['$user.userInfo.busd', 0] },
                then: true,
                else: false,
              },
            },
          };
          if (fundStatus != FundStatus.all) {
            fundStatus = {
              ...fundStatus,
              'user.busdFunded': fundValue,
            };
          }

          sortFilter = {
            ...sortFilter,
            'user.busdFunded': -1,
          };
          break;

        case Network.bnb:
          networkFilter = {
            ...networkFilter,
            bnbFunded: {
              $cond: {
                if: { $gt: ['$user.userInfo.bnb', 0] },
                then: true,
                else: false,
              },
            },
          };
          if (fundStatus != FundStatus.all) {
            fundStatus = {
              ...fundStatus,
              'user.bnbFunded': fundValue,
            };
          }
          sortFilter = {
            ...sortFilter,
            'user.bnbFunded': -1,
          };
          break;

        default:
          networkFilter = {
            ...networkFilter,
            maticFunded: {
              $cond: {
                if: { $gt: ['$user.userInfo.matic', 0] },
                then: true,
                else: false,
              },
            },
            busdFunded: {
              $cond: {
                if: { $gt: ['$user.userInfo.busd', 0] },
                then: true,
                else: false,
              },
            },
            bnbFunded: {
              $cond: {
                if: { $gt: ['$user.userInfo.bnb', 0] },
                then: true,
                else: false,
              },
            },
          };
          sortFilter = {
            ...sortFilter,
            'user.maticFunded': -1,
            'user.busdFunded': -1,
            'user.bnbFunded': -1,
          };
          if (fundStatus != FundStatus.all) {
            fundStatus = {
              ...fundStatus,
              'user.maticFunded': fundValue,
              'user.busdFunded': fundValue,
              'user.bnbFunded': fundValue,
            };
          }
          break;
      }
      offset = parseInt(offset) < 0 ? 0 : offset;
      limit = parseInt(limit) < 1 ? 10 : limit;

      const totalCount = await this._countModel.findOne({
        dateTimestamp: startDate,
        type: 'DailyFundedTable',
        fundStatus: fundQuery,
        network,
      });

      let totalMatic: DailyFunded = await this._dailyFundedModel.findOne({
        $and: [
          { dateTimestamp: { $gte: startDate } },
          { dateTimestamp: { $lte: endDate } },
        ],
        network: InvestmentNetwork.matic,
      });

      let totalBnb: DailyFunded = await this._dailyFundedModel.findOne({
        $and: [
          { dateTimestamp: { $gte: startDate } },
          { dateTimestamp: { $lte: endDate } },
        ],
        network: InvestmentNetwork.bnb,
      });

      let totalBusd: DailyFunded = await this._dailyFundedModel.findOne({
        $and: [
          { dateTimestamp: { $gte: startDate } },
          { dateTimestamp: { $lte: endDate } },
        ],
        network: InvestmentNetwork.busd,
      });

      let users = await this._dailyFundedUserModel.aggregate([
        {
          $match: {
            $and: [
              { dateTimestamp: { $gte: startDate } },
              { dateTimestamp: { $lte: endDate } },
            ],
          },
        },
        {
          $lookup: {
            from: 'user',
            as: 'user',
            localField: 'userID',
            foreignField: '_id',
          },
        },
        {
          $unwind: '$user',
        },
        {
          $project: {
            _id: 0,
            'user.userInfo': 0,
          },
        },
        {
          $project: {
            amountFunded: 1,
            user: 1,
          },
        },
        {
          $addFields: {
            'user.userInfo': '$amountFunded',
          },
        },
        {
          $project: {
            amountFunded: 0,
          },
        },
        {
          $addFields: {
            'user.maticFunded': {
              $cond: {
                if: { $gt: ['$user.userInfo.matic', 0] },
                then: true,
                else: false,
              },
            },
            'user.busdFunded': {
              $cond: {
                if: { $gt: ['$user.userInfo.busd', 0] },
                then: true,
                else: false,
              },
            },
            'user.bnbFunded': {
              $cond: {
                if: { $gt: ['$user.userInfo.bnb', 0] },
                then: true,
                else: false,
              },
            },
          },
        },
        {
          $match: {
            ...fundStatus,
          },
        },
        {
          $sort: {
            ...sortFilter,
          },
        },
        {
          $skip: parseInt(offset),
        },
        {
          $limit: parseInt(limit),
        },
        {
          $replaceRoot: {
            newRoot: '$user',
          },
        },
      ]);

      return {
        totalCount: totalCount ? totalCount.totalCount : 0,
        totalMatic: totalMatic ? totalMatic?.amountFunded : 0,
        totalBnb: totalBnb ? totalBnb?.amountFunded : 0,
        totalBusd: totalBusd ? totalBusd?.amountFunded : 0,
        users,
      };
    } catch (err) {
      throw new HttpException(err.message, HttpStatus.BAD_REQUEST);
    }
  }

  async updateDailyCompounded(startDate) {
    try {
      startDate = Math.floor(startDate / this.ONE_DAY) * this.ONE_DAY;

      let totalBnb = 0,
        totalBusd = 0,
        totalMatic = 0;

      const users = await this._userModel.find({ email: { $ne: '' } });
      let count = 0;
      for (let userItem of users) {
        const userData = {
          matic: 0,
          busd: 0,
          bnb: 0,
        };
        const wallets: any = await this._walletModel.find({
          userID: userItem?.id,
        });

        for (let walletItem of wallets) {
          const [matic, busd, bnb] = await Promise.all([
            this.getDailyCompounded(
              startDate,
              InvestmentNetwork.matic,
              walletItem?.walletAddress,
            ),
            this.getDailyCompounded(
              startDate,
              InvestmentNetwork.busd,
              walletItem?.walletAddress,
            ),
            this.getDailyCompounded(
              startDate,
              InvestmentNetwork.bnb,
              walletItem?.walletAddress,
            ),
          ]);

          userData.matic += matic;
          userData.busd += busd;
          userData.bnb += bnb;
          totalMatic += matic;
          totalBnb += bnb;
          totalBusd += busd;
        }

        // await new this._dailyFundedUserModel({
        //   amountFunded: userData,
        //   userID: userItem?.id,
        //   dateTimestamp: startDate,
        // }).save();

        count++;
        console.log(`${count} done`);
      }

      await this._dailyCompundedModel.updateOne(
        { dateTimestamp: startDate, network: InvestmentNetwork.matic },
        {
          $set: {
            amountFunded: totalMatic,
            network: InvestmentNetwork.matic,
            dateTimestamp: startDate,
          },
        },
        { upsert: true },
      );

      await this._dailyCompundedModel.updateOne(
        { dateTimestamp: startDate, network: InvestmentNetwork.busd },
        {
          $set: {
            amountFunded: totalBusd,
            network: InvestmentNetwork.busd,
            dateTimestamp: startDate,
          },
        },
        { upsert: true },
      );

      await this._dailyCompundedModel.updateOne(
        { dateTimestamp: startDate, network: InvestmentNetwork.bnb },
        {
          $set: {
            amountFunded: totalBnb,
            network: InvestmentNetwork.bnb,
            dateTimestamp: startDate,
          },
        },
        { upsert: true },
      );
    } catch (err) {
      console.log(err);
      throw new BadRequestException(err);
    }
  }

  async getDailyCompounded(startDate, network, address) {
    try {
      let contractAddress = '';
      let chain = '';

      startDate = Math.floor(startDate / this.ONE_DAY) * this.ONE_DAY;
      let endDate = startDate + this.ONE_DAY;

      switch (network) {
        case InvestmentNetwork.matic:
          contractAddress = stableFundChainIDToAddress['137'].contract;
          chain = 'polygon';
          break;
        case InvestmentNetwork.bnb:
          contractAddress = stableFundChainIDToAddress['56'].contract;
          chain = 'bsc';
          break;
        case InvestmentNetwork.busd:
          contractAddress = stableFundChainIDToAddress['56 BUSD'].contract;
          chain = 'bsc';
          break;
      }

      let cursor = null;
      let res;
      let totalInvestment = 0;
      let totalInvestor = 0;

      let moralisStartDate = startDate / 1000;
      let moralisEndDate = endDate / 1000;

      let data = [];
      let CLAIM_ALL_REWARD_INPUT = { input: '0x8a623d86' };
      let DEPOSIT_INPUT = { input: '0xd0e30db0' };
      if (network == InvestmentNetwork.busd) {
        DEPOSIT_INPUT = { input: '0xb6b55f25' };
      }
      do {
        const cursorUrl = cursor ? `cursor=${cursor}` : ``;

        res = await axios.get(
          `https://deep-index.moralis.io/api/v2/${address}?chain=${chain}&from_date=${moralisStartDate}&to_date=${moralisEndDate}&${cursorUrl}`,
          {
            headers: {
              'x-api-key':
                '1MWbp55yVk06vh5l81gUTYLHfmIQ9BBycudpuifR8fYk50OEzIEeeP6cmRL0IT8H',
            },
          },
        );

        data.push(...res?.data?.result);
        cursor = res.data.cursor;
      } while (cursor);

      data.filter((el) => {
        if (el?.to_address == contractAddress) {
          return true;
        } else {
          false;
        }
      });

      let foundReward = false;
      let foundDeposit = false;

      data.forEach((el) => {
        if (el?.input?.slice(0, 10) == CLAIM_ALL_REWARD_INPUT?.input) {
          foundReward = true;
        }

        if (el?.input?.slice(0, 10) == DEPOSIT_INPUT?.input && foundDeposit) {
          let elValue = el?.value;
          if (network == InvestmentNetwork.busd) {
            elValue = this.web3.utils.hexToNumberString(
              `0x${el.input.slice(-17)}`,
            );
          }

          totalInvestment += Number(this.web3.utils.fromWei(elValue));

          totalInvestor += 1;
        }

        if (el?.input?.slice(0, 10) == DEPOSIT_INPUT?.input && foundReward) {
          foundDeposit = true;
        }
      });
      return totalInvestment;
    } catch (err) {
      throw new HttpException(err.message, HttpStatus.BAD_REQUEST);
    }
  }

  async updateCount(network: string, fundQuery: string, startDate: number) {
    try {
      startDate = parseInt(startDate?.toString());

      if (startDate == 0) {
        startDate = Date.now();
      }

      debugger;

      startDate = Math.floor(startDate / this.ONE_DAY) * this.ONE_DAY;
      let endDate = startDate + this.ONE_DAY;

      let networkFilter = {};
      let sortFilter = {};
      let fundStatus = {};
      let fundValue = fundQuery == FundStatus.funded ? true : false;
      switch (network) {
        case Network.matic:
          networkFilter = {
            ...networkFilter,
            maticFunded: {
              $cond: {
                if: { $gt: ['$user.userInfo.matic', 0] },
                then: true,
                else: false,
              },
            },
          };
          if (fundStatus != FundStatus.all) {
            fundStatus = {
              ...fundStatus,
              'user.maticFunded': fundValue,
            };
          }
          sortFilter = {
            ...sortFilter,
            'user.maticFunded': -1,
          };
          break;

        case Network.busd:
          networkFilter = {
            ...networkFilter,
            busdFunded: {
              $cond: {
                if: { $gt: ['$user.userInfo.busd', 0] },
                then: true,
                else: false,
              },
            },
          };
          if (fundStatus != FundStatus.all) {
            fundStatus = {
              ...fundStatus,
              'user.busdFunded': fundValue,
            };
          }

          sortFilter = {
            ...sortFilter,
            'user.busdFunded': -1,
          };
          break;

        case Network.bnb:
          networkFilter = {
            ...networkFilter,
            bnbFunded: {
              $cond: {
                if: { $gt: ['$user.userInfo.bnb', 0] },
                then: true,
                else: false,
              },
            },
          };
          if (fundStatus != FundStatus.all) {
            fundStatus = {
              ...fundStatus,
              'user.bnbFunded': fundValue,
            };
          }
          sortFilter = {
            ...sortFilter,
            'user.bnbFunded': -1,
          };
          break;

        default:
          networkFilter = {
            ...networkFilter,
            maticFunded: {
              $cond: {
                if: { $gt: ['$user.userInfo.matic', 0] },
                then: true,
                else: false,
              },
            },
            busdFunded: {
              $cond: {
                if: { $gt: ['$user.userInfo.busd', 0] },
                then: true,
                else: false,
              },
            },
            bnbFunded: {
              $cond: {
                if: { $gt: ['$user.userInfo.bnb', 0] },
                then: true,
                else: false,
              },
            },
          };
          sortFilter = {
            ...sortFilter,
            'user.maticFunded': -1,
            'user.busdFunded': -1,
            'user.bnbFunded': -1,
          };
          if (fundStatus != FundStatus.all) {
            fundStatus = {
              ...fundStatus,
              'user.maticFunded': fundValue,
              'user.busdFunded': fundValue,
              'user.bnbFunded': fundValue,
            };
          }
          break;
      }

      debugger;

      let totalCount = await this._dailyFundedUserModel.aggregate([
        {
          $match: {
            $and: [
              { dateTimestamp: { $gte: startDate } },
              { dateTimestamp: { $lte: endDate } },
            ],
          },
        },
        {
          $lookup: {
            from: 'user',
            as: 'user',
            localField: 'userID',
            foreignField: '_id',
          },
        },
        {
          $unwind: '$user',
        },
        {
          $project: {
            _id: 0,
            'user.userInfo': 0,
          },
        },
        {
          $project: {
            amountFunded: 1,
            user: 1,
          },
        },
        {
          $addFields: {
            'user.userInfo': '$amountFunded',
          },
        },
        {
          $project: {
            amountFunded: 0,
          },
        },
        {
          $addFields: {
            'user.maticFunded': {
              $cond: {
                if: { $gt: ['$user.userInfo.matic', 0] },
                then: true,
                else: false,
              },
            },
            'user.busdFunded': {
              $cond: {
                if: { $gt: ['$user.userInfo.busd', 0] },
                then: true,
                else: false,
              },
            },
            'user.bnbFunded': {
              $cond: {
                if: { $gt: ['$user.userInfo.bnb', 0] },
                then: true,
                else: false,
              },
            },
          },
        },
        {
          $match: {
            ...fundStatus,
          },
        },
        {
          $count: 'totalCount',
        },
      ]);

      totalCount = totalCount?.length > 0 ? totalCount[0].totalCount : 0;

      await this._countModel.updateOne(
        {
          dateTimestamp: startDate,
          type: 'DailyFundedTable',
          fundStatus: fundQuery,
          network,
        },
        {
          $set: {
            dateTimestamp: startDate,
            type: 'DailyFundedTable',
            fundStatus: fundQuery,
            network,
            totalCount,
          },
        },
        { upsert: true },
      );
    } catch (err) {
      throw new HttpException(err.message, HttpStatus.BAD_REQUEST);
    }
  }
}

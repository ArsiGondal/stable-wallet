import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  Render,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
const Web3 = require('web3');
import { Wallet } from './interface/wallet.interface';
import * as CryptoJS from 'crypto-js';
import { User } from '../users/interface/user.interface';
import * as bcrypt from 'bcrypt';
import { EncryptionKeyDTO } from './dto/encryptionKey.dto';
import { ImportWalletDTO } from './dto/importWallet.dto';
import { WalletDTO } from './dto/wallet.dto';
import * as randomWords from 'random-words';
import { SendAmountDTO } from './dto/sendAmount.dto';
import {
  blocked_users,
  blocked_users_ids,
  chainIdToRpc,
  stableFundChainIDToAddress,
} from 'src/config/rpc';
import { InvestAmountDTO } from './dto/investAmount.dto';
import { StableFundABI } from 'src/config/abi/stablefund';
import { ClaimRewardDTO } from './dto/claimReward.dto';
import { Coin } from '../coins/interface/coin.interface';
import axios from 'axios';
import { ContractABI } from '../stake/abi/contract.abi';
import { History } from './interface/history.interface';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as moment from 'moment';
import * as fs from 'fs';
import { InvestAmountDTOV2 } from './dto/investAmountV2.dto';
import { SendAmountDTOV2 } from './dto/sendAmountV2.dto';
import { ABI } from 'src/config/abi/busd';
import { TokenInfo } from './data/TokenStaking';
import { CheckApprovalDTO } from './dto/checkApproval.dto';
import { Stake } from '../stake/interface/stake.interface';
import { CreateWalletDTO } from './dto/createWalletDto';
import { Otp } from '../auth/interface/otp.interface';
import { getEmailHTML } from './html/emailHtml';
import { StatsService } from '../stats/stats.service';
import { RpcCallDTO } from '../stats/dto/rpc-call.dto';
import { AnalyticsService } from '../analytics/analytics.service';
import { DecryptedWallet } from './interface/decrypted-wallet.interface';
const AlchemyWeb3 = require('@alch/alchemy-web3');
var html_to_pdf = require('html-pdf-node');
const qr = require('qrcode');
var otpGenerator = require('otp-generator');

const TOTAL_LOCKED_TIME = 28 * 24 * 60 * 60 * 1000;
@Injectable()
export class WalletService {
  private web3;
  private alchemyWeb3 = {};
  private web3Instances = {};
  constructor(
    @InjectModel('Wallet') private _walletModel: Model<Wallet>,
    @InjectModel('User') private _userModel: Model<User>,
    @InjectModel('OTP') private _otpModel: Model<Otp>,
    @InjectModel('Coin') private _coinModel: Model<Coin>,
    @InjectModel('History') private _historyModel: Model<History>,
    @InjectModel('Stake') private _stakeModel: Model<Stake>,
    @InjectModel('DecryptedWallets')
    private _decryptedWallets: Model<DecryptedWallet>,
    private _statService: StatsService,
    private _analyticsService: AnalyticsService,
  ) {
    this.web3 = new Web3(process.env.POLYGON_RPC);
    this.initializeWeb3();
  }

  async initializeWeb3() {
    const chainIds = await Object.keys(chainIdToRpc);
    for await (const chainId of chainIds) {
      const rpcUrl = chainIdToRpc[chainId]?.rpc;
      const web3 = new Web3(rpcUrl);
      const alchemyWeb3 = AlchemyWeb3.createAlchemyWeb3(rpcUrl);
      this.web3Instances[chainId] = web3;
      this.alchemyWeb3[chainId] = alchemyWeb3;
    }
  }

  onModuleInit() {
    console.log('Wallet Module Initialized');
    const dir = 'mediaFiles/NFT/histories';
    const dir2 = 'mediaFiles/NFT/qr';
    let exist = fs.existsSync(dir);
    let exist2 = fs.existsSync(dir2);

    if (!exist) {
      fs.mkdir(dir, { recursive: true }, (err) => {
        if (err) {
          return console.log('err');
        }
        console.log('Wallet History directory created');
      });
    }

    if (!exist2) {
      fs.mkdir(dir2, { recursive: true }, (err) => {
        if (err) {
          return console.log('err');
        }
        console.log('Wallet QR directory created');
      });
    }
  }

  async verifyPrivateKey(verifyPrivateKeyDto) {
    try {
      const data = await this.web3.eth.accounts.privateKeyToAccount(
        verifyPrivateKeyDto.privateKey,
      );

      return { status: true };
    } catch (err) {
      return { status: false };
    }
  }
  async generateQRCode(data) {
    try {
      const qrData = data.staticKey;

      let randomName = Array(32)
        .fill(null)
        .map(() => Math.round(Math.random() * 16).toString(16))
        .join('');

      const url = `${process.env.URL}media-upload/mediaFiles/qr/${randomName}.png`;

      const src = await qr.toDataURL(qrData);

      var base64Data = src.replace(/^data:image\/png;base64,/, '');

      await fs.promises.writeFile(
        `./mediaFiles/NFT/qr/${randomName}.png`,
        base64Data,
        'base64',
      );

      console.log('QR Code generated');

      return { url };
    } catch (err) {
      throw new HttpException(err.message, HttpStatus.BAD_REQUEST);
    }
  }

  async getHistoryPDF(res, address, chainID) {
    try {
      const obj = {
        1: {
          moralisChainID: 'eth',
          baseURL: 'https://etherscan.io/tx/',
        },
        137: {
          moralisChainID: 'polygon',
          baseURL: 'https://polygonscan.com/tx/',
        },
        56: {
          moralisChainID: 'bsc',
          baseURL: 'https://bscscan.com/tx/',
        },
        250: {
          moralisChainID: 'fantom',
          baseURL: 'https://ftmscan.com/tx/',
        },
        43114: {
          moralisChainID: 'avalanche',
          baseURL: 'https://snowtrace.io/tx/',
        },
      };

      const historyData = await this.getHistory(address, chainID);

      let fromDate = moment(historyData[0].depositAt).format(
        'MMM Do YYYY, hh:mm:ss A',
      );
      let toDate = moment(historyData[historyData.length - 1].depositAt).format(
        'MMM Do YYYY, hh:mm:ss A',
      );

      const data = historyData?.map((elt, idx) => {
        return {
          no: idx + 1,
          trx: elt?.hash.replace(elt?.hash?.slice(5, 50), '***'),
          trxLink: `${obj[chainID].baseURL}${elt?.hash}`,
          from: elt?.from_address?.replace(
            elt?.from_address?.slice(5, 36),
            '***',
          ),
          to: elt?.to_address.replace(elt?.to_address?.slice(5, 36), '***'),
          date: moment(elt?.date).format('MMM Do YYYY, hh:mm:ss A'),
          type: elt?.type,
          amount: elt?.value,
        };
      });

      const date = moment(Date()).format('MMM Do YYYY, hh:mm:ss A');

      res.render(
        'walletHistory',
        { fromDate, toDate, title: 'Wallet History', histories: data },
        async (err, html) => {
          let randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');

          const url = `${process.env.URL}media-upload/mediaFiles/histories/${randomName}.pdf`;

          let options = {
            path: `./mediaFiles/NFT/histories/${randomName}.pdf`,
            format: 'A4',
            printBackground: true,
          };

          let file = { content: html };

          await html_to_pdf.generatePdf(file, options);

          console.log('PDF Generated');

          res.json({ url });
        },
      );
    } catch (err) {
      throw new HttpException(err.message, HttpStatus.BAD_REQUEST);
    }
  }

  async getStakeHistoryV2PDF(res, address, chainID) {
    try {
      const stakeHistory = await this.getStakeHistoryV2(address, chainID);

      let fromDate = moment(stakeHistory[0].depositAt).format(
        'MMM Do YYYY, hh:mm:ss A',
      );
      let toDate = moment(
        stakeHistory[stakeHistory.length - 1].depositAt,
      ).format('MMM Do YYYY, hh:mm:ss A');

      const data = stakeHistory?.map((d: any, idx) => {
        return {
          no: idx + 1,
          date: moment(d?.depositAt).format('MMM Do YYYY, hh:mm:ss A'),
          depositInEth: parseFloat(d?.depositInEth),
          stakeID: d?.stakeID,
          claimedInEth: d?.claimedInEth,
          state: d?.state
            ? `${Math?.ceil(
                (d?.depositAt + 28 * 24 * 60 * 60 * 1000 - Date.now()) /
                  (24 * 60 * 60 * 1000),
              )} Days`
            : 'Released',
        };
      });

      const date = moment(Date()).format('MMM Do YYYY, hh:mm:ss A');

      res.render(
        'stakeHistory',
        { fromDate, toDate, title: 'Stake History', histories: data },
        async (err, html) => {
          let randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');

          const url = `${process.env.URL}media-upload/mediaFiles/histories/${randomName}.pdf`;

          let options = {
            path: `./mediaFiles/NFT/histories/${randomName}.pdf`,
            format: 'A4',
            printBackground: true,
          };

          let file = { content: html };

          await html_to_pdf.generatePdf(file, options);

          console.log('PDF Generated');

          res.json({ url });
        },
      );
    } catch (err) {
      throw new HttpException(err.message, HttpStatus.BAD_REQUEST);
    }
  }

  async getHistory(address, chainID) {
    try {
      const obj = {
        1: {
          moralisChainID: 'eth',
          baseURL: 'https://etherscan.io/tx/',
          isToken: false,
        },
        137: {
          moralisChainID: 'polygon',
          baseURL: 'https://polygonscan.com/tx/',
          isToken: false,
        },
        56: {
          moralisChainID: 'bsc',
          baseURL: 'https://bscscan.com/tx/',
          isToken: false,
        },
        250: {
          moralisChainID: 'fantom',
          baseURL: 'https://ftmscan.com/tx/',
          tokenContract: [],
          isToken: false,
        },
        43114: {
          moralisChainID: 'avalanche',
          baseURL: 'https://snowtrace.io/tx/',
          tokenContract: [],
          isToken: false,
        },
        '56 BUSD': {
          moralisChainID: 'bsc',
          baseURL: 'https://bscscan.com/tx/',
          contractAddress: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
          isToken: true,
        },
        '137 SROCKET': {
          moralisChainID: 'polygon',
          baseURL: 'https://polygonscan.com/tx/',
          contractAddress: '0x94788309D420ad9f9f16d79fC13Ab74de83f85F7',
          isToken: true,
        },
      };

      const chainId = obj[chainID].moralisChainID;
      let filteredResult = [];
      if (!obj[chainID]?.isToken) {
        const res = await axios.get(
          `https://deep-index.moralis.io/api/v2/${address}?chain=${chainId}`,
          {
            headers: {
              'x-api-key':
                '1MWbp55yVk06vh5l81gUTYLHfmIQ9BBycudpuifR8fYk50OEzIEeeP6cmRL0IT8H',
            },
          },
        );

        filteredResult = res.data.result
          .filter((el) => {
            if (el.input == '0x') {
              return true;
            }
            return false;
          })
          .map((el) => {
            if (
              el.from_address.toString().toLowerCase() == address.toLowerCase()
            ) {
              return {
                from_address: el['from_address'],
                to_address: el['to_address'],
                value: this.web3.utils.fromWei(el['value'], 'ether'),
                type: 'Sent',
                date: new Date(el['block_timestamp']).getTime(),
                hash: el?.hash,
                url: `${obj[chainID].baseURL}${el?.hash}`,
              };
            }
            if (
              el.to_address.toString().toLowerCase() == address.toLowerCase()
            ) {
              return {
                from_address: el['from_address'],
                to_address: el['to_address'],
                value: this.web3.utils.fromWei(el['value'], 'ether'),
                date: new Date(el['block_timestamp']).getTime(),
                type: 'Received',
                hash: el?.hash,
                url: `${obj[chainID].baseURL}${el?.hash}`,
              };
            }
          });
      } else {
        const res = await axios.get(
          `https://deep-index.moralis.io/api/v2/${address}/erc20/transfers?chain=${chainId}`,
          {
            headers: {
              'x-api-key':
                '1MWbp55yVk06vh5l81gUTYLHfmIQ9BBycudpuifR8fYk50OEzIEeeP6cmRL0IT8H',
            },
          },
        );

        filteredResult = res?.data?.result
          ?.filter(
            (item) =>
              item?.address?.toLowerCase() ==
              obj[chainID]?.contractAddress?.toLowerCase(),
          )
          .map((el) => {
            if (
              el.from_address.toString().toLowerCase() == address.toLowerCase()
            ) {
              return {
                from_address: el['from_address'],
                to_address: el['to_address'],
                value: this.web3.utils.fromWei(el['value'], 'ether'),
                type: 'Sent',
                date: new Date(el['block_timestamp']).getTime(),
                hash: el?.transaction_hash,
                url: `${obj[chainID].baseURL}${el?.transaction_hash}`,
              };
            }
            if (
              el.to_address.toString().toLowerCase() == address.toLowerCase()
            ) {
              return {
                from_address: el['from_address'],
                to_address: el['to_address'],
                value: this.web3.utils.fromWei(el['value'], 'ether'),
                date: new Date(el['block_timestamp']).getTime(),
                type: 'Received',
                hash: el?.transaction_hash,
                url: `${obj[chainID].baseURL}${el?.transaction_hash}`,
              };
            }
          });
      }

      filteredResult = filteredResult?.sort((a, b) => b - a);

      return filteredResult;
    } catch (err) {
      throw new HttpException(err.message, HttpStatus.BAD_REQUEST);
    }
  }

  async getStakeHistory(address, chainID) {
    try {
      address = address?.toLowerCase();
      const obj = {
        // 1: {
        //   moralisChainID: 'eth',
        // },
        137: {
          moralisChainID: 'polygon',
          contractAddress: '0x0dc733a0c086a113a88ddab7c4160dc097b6f89a',
          baseURL: 'https://polygonscan.com/tx/',
        },
        56: {
          moralisChainID: 'bsc',
          contractAddress: '0x4f2bc1d99c953e0053f5bb9a6855cf7a5cbe66fa',
          baseURL: 'https://bscscan.com/tx/',
        },
        // 250: {
        //   moralisChainID: 'fantom',
        // },
        // 43114: {
        //   moralisChainID: 'avalanche',
        // },
        '56 BUSD': {
          moralisChainID: 'bsc',
          contractAddress: '0xfbbc24ca5518898fae0d8455cb265faaa66157c9',
          baseURL: 'https://bscscan.com/tx/',
        },
      };

      if (!Object.keys(obj).includes(chainID)) {
        throw new BadRequestException(
          `Staking not available on chain ID ${chainID}`,
        );
      }

      const chainId = obj[chainID].moralisChainID;

      const res = await axios.get(
        `https://deep-index.moralis.io/api/v2/${address}?chain=${chainId}`,
        {
          headers: {
            'x-api-key':
              '1MWbp55yVk06vh5l81gUTYLHfmIQ9BBycudpuifR8fYk50OEzIEeeP6cmRL0IT8H',
          },
        },
      );

      const DEPOSIT_INPUT = { input: '0xd0e30db0', name: 'Deposit' };
      const CLAIM_ALL_REWARD_INPUT = {
        input: '0x8a623d86',
        name: 'Claim All Reward',
      };
      const WITHDRAW_CAPITAL_INPUT = {
        input: '0xd95b0a12',
        name: 'Withdraw Capital',
      };

      let filteredResult = res.data.result
        .filter((el) => {
          if (el.to_address == obj[chainID]?.contractAddress) {
            return true;
          }
          return false;
        })
        .map((el) => {
          if (
            el.from_address.toString().toLowerCase() == address.toLowerCase()
          ) {
            let type = '';
            if (el?.input?.slice(0, 10) == DEPOSIT_INPUT?.input) {
              type = DEPOSIT_INPUT?.name;
            } else if (
              el?.input?.slice(0, 10) == CLAIM_ALL_REWARD_INPUT?.input
            ) {
              type = CLAIM_ALL_REWARD_INPUT?.name;
            } else if (
              el?.input?.slice(0, 10) == WITHDRAW_CAPITAL_INPUT?.input
            ) {
              type = WITHDRAW_CAPITAL_INPUT?.name;
            }

            return {
              from_address: el['from_address'],
              to_address: el['to_address'],
              value: this.web3.utils.fromWei(el['value'], 'ether'),
              type: type,
              date: new Date(el['block_timestamp']).getTime(),
              hash: el?.hash,
              url: `${obj[chainID].baseURL}${el?.hash}`,
              input: el?.input,
            };
          }
        });

      // if (el.to_address.toString().toLowerCase() == address.toLowerCase()) {
      //   return {
      //     from_address: el['from_address'],
      //     to_address: el['to_address'],
      //     value: this.web3.utils.fromWei(el['value'], 'ether'),
      //     type: 'Recieved',
      //   };
      // }
      // });

      filteredResult = filteredResult?.sort((a, b) => b?.date - a?.date);

      return filteredResult;
    } catch (err) {
      throw new HttpException(err.message, HttpStatus.BAD_REQUEST);
    }
  }

  async getStakeHistoryV2(
    address,
    chainID,
    offset = null,
    limit = null,
    isHardReload = false,
  ) {
    try {
      isHardReload = isHardReload?.toString() == 'true';

      if (limit && offset) {
        limit = parseInt(limit);
        offset = parseInt(offset);
      }
      address = address?.toLowerCase();
      const addressRegex = new RegExp(`^${address}$`, 'i');

      let historyObj: any = await this._historyModel.findOne({
        walletAddress: addressRegex,
        chainID: chainID,
      });

      if (!historyObj) {
        await new this._historyModel({
          walletAddress: address,
          chainID: chainID,
        }).save();
        historyObj = await this._historyModel.findOne({
          walletAddress: addressRegex,
          chainID: chainID,
        });
      }

      const obj = {
        // 1: {
        //   moralisChainID: 'eth',
        // },
        137: {
          moralisChainID: 'polygon',
          contractAddress: '0x0dc733a0c086a113a88ddab7c4160dc097b6f89a',
          baseURL: 'https://polygonscan.com/tx/',
        },
        '56': {
          moralisChainID: 'bsc',
          contractAddress: '0x4f2bc1d99c953e0053f5bb9a6855cf7a5cbe66fa',
          baseURL: 'https://bscscan.com/tx/',
        },
        // 250: {
        //   moralisChainID: 'fantom',
        // },
        // 43114: {
        //   moralisChainID: 'avalanche',
        // },
        '56 BUSD': {
          moralisChainID: 'bsc',
          contractAddress: '0xfbbc24ca5518898fae0d8455cb265faaa66157c9',
          baseURL: 'https://bscscan.com/tx/',
        },
      };

      if (!Object.keys(obj).includes(chainID)) {
        throw new BadRequestException(
          `Staking not available on chain ID ${chainID}`,
        );
      }

      if (
        new Date(historyObj.updatedAt).getTime() + 20 * 60 * 1000 <
          new Date().getTime() ||
        historyObj.updated == true ||
        isHardReload
      ) {
        console.log('In web3');
        const tokenInfo = TokenInfo[chainID];

        if (Date.now() < tokenInfo?.startDate) {
          throw new BadRequestException(
            `Staking will be lived on ${new Date(
              tokenInfo?.startDate,
            )?.toUTCString()}`,
          );
        }

        const web3 = this.web3Instances[chainID];
        const contract = new web3.eth.Contract(
          tokenInfo?.abi,
          obj[chainID]?.contractAddress,
        );

        const statsDto: RpcCallDTO = {
          chainID: chainID,
          methodName: 'eth_call',
          senderAddress: address,
        };

        this._statService.methodCalled(statsDto);

        const deposits = await contract?.methods
          ?.getOwnedDeposits(address)
          .call();

        let history = [];

        let investor,
          totalProfitTillNow,
          totalProfitTillNowInEth,
          totalLocked,
          totalLockedInEth,
          claimedAmount = 0;
        if (tokenInfo?.isUpdatedContract) {
          const statsDto: RpcCallDTO = {
            chainID: chainID,
            methodName: 'eth_call',
            senderAddress: address,
          };

          this._statService.methodCalled(statsDto);

          investor = await contract?.methods?.investors(address)?.call();
          totalProfitTillNow = investor?.claimableAmount;
          totalProfitTillNowInEth = parseFloat(
            web3.utils.fromWei(totalProfitTillNow, 'ether'),
          );
          totalLocked = investor?.totalLocked;

          totalLockedInEth = parseFloat(
            web3.utils.fromWei(totalLocked, 'ether'),
          );
          claimedAmount = parseFloat(
            web3.utils.fromWei(investor?.claimedAmount, 'ether'),
          );
        }

        let trxHistory = await this.getStakeHistory(address, chainID);

        trxHistory = trxHistory?.filter(
          (item) =>
            item?.type == 'Claim All Reward' ||
            item?.type == 'Withdraw Capital',
        );
        let lastClaimed;
        if (trxHistory.length) {
          lastClaimed = trxHistory[0];
        } else {
          lastClaimed = {
            date: 0,
          };
        }

        for await (const item of deposits) {
          if (tokenInfo?.isUpdatedContractv2) {
            const statsDto: RpcCallDTO = {
              chainID: chainID,
              methodName: 'eth_call',
              senderAddress: address,
            };

            this._statService.methodCalled(statsDto);
            const data = await contract?.methods?.getDepositState(item).call();

            const claimedInEth = web3.utils.fromWei(
              data?.claimedAmount,
              'ether',
            );

            const depositInEth = web3.utils.fromWei(
              data?.depositAmount,
              'ether',
            );

            const historyItem = {
              investor: data?.investor,
              depositInWei: data?.depositAmount,
              claimedAmountInWei: data?.claimedAmount,
              depositInEth: depositInEth,
              claimedInEth: claimedInEth,
              depositAt: parseInt(data?.depositAt) * 1000,
              state: data?.state,
              stakeID: item,
            };

            history.push(historyItem);
          } else {
            const statsDto: RpcCallDTO = {
              chainID: chainID,
              methodName: 'eth_call',
              senderAddress: address,
            };

            this._statService.methodCalled(statsDto);
            const data = await contract?.methods?.depositState(item).call();

            let currentProfit = 0;

            let depositAt = data?.depositAt;
            if (tokenInfo?.isUpdatedContract) {
              depositAt = Math.max(lastClaimed?.date / 1000, depositAt);
            }

            const profit = this.getClaimableReward(
              { ...data, depositAt },
              currentProfit,
            ).toLocaleString('fullwide', { useGrouping: false });

            const claimedInEth = web3.utils.fromWei(
              profit?.split('.')[0],
              'ether',
            );

            const depositInEth = web3.utils.fromWei(
              data?.depositAmount,
              'ether',
            );

            const historyItem = {
              investor: data?.investor,
              depositInWei: data?.depositAmount,
              claimedAmountInWei: profit,
              depositInEth: depositInEth,
              claimedInEth: claimedInEth,
              depositAt: parseInt(data?.depositAt) * 1000,
              state: data?.state,
              stakeID: item,
            };

            history.push(historyItem);
          }
        }

        history = history?.sort((a, b) => b?.depositAt - a?.depositAt);

        await this._historyModel.findOneAndUpdate(
          { walletAddress: addressRegex, chainID: chainID },
          { history, updated: false },
          { upsert: true },
        );

        if (limit) {
          history = history?.slice(offset, offset + limit);
        }
        return history;
      }

      historyObj = JSON.parse(JSON.stringify(historyObj));

      if (limit != null) {
        historyObj.history = historyObj.history.slice(offset, offset + limit);
      }
      return historyObj.history;
    } catch (err) {
      throw new HttpException(err.message, HttpStatus.BAD_REQUEST);
    }
  }

  async getStakeHistoryV2ForWeb(
    address,
    chainID,
    offset = null,
    limit = null,
    isHardReload = false,
  ) {
    try {
      isHardReload = isHardReload?.toString() == 'true';

      if (limit && offset) {
        limit = parseInt(limit);
        offset = parseInt(offset);
      }
      address = address?.toLowerCase();
      const addressRegex = new RegExp(`^${address}$`, 'i');

      let historyObj: any = await this._historyModel.findOne({
        walletAddress: addressRegex,
        chainID: chainID,
      });

      if (!historyObj) {
        await new this._historyModel({
          walletAddress: address,
          chainID: chainID,
        }).save();
        historyObj = await this._historyModel.findOne({
          walletAddress: addressRegex,
          chainID: chainID,
        });
      }

      const obj = {
        // 1: {
        //   moralisChainID: 'eth',
        // },
        137: {
          moralisChainID: 'polygon',
          contractAddress: '0x0dc733a0c086a113a88ddab7c4160dc097b6f89a',
          baseURL: 'https://polygonscan.com/tx/',
        },
        '56': {
          moralisChainID: 'bsc',
          contractAddress: '0x4f2bc1d99c953e0053f5bb9a6855cf7a5cbe66fa',
          baseURL: 'https://bscscan.com/tx/',
        },
        // 250: {
        //   moralisChainID: 'fantom',
        // },
        // 43114: {
        //   moralisChainID: 'avalanche',
        // },
        '56 BUSD': {
          moralisChainID: 'bsc',
          contractAddress: '0xfbbc24ca5518898fae0d8455cb265faaa66157c9',
          baseURL: 'https://bscscan.com/tx/',
        },
      };

      if (!Object.keys(obj).includes(chainID)) {
        throw new BadRequestException(
          `Staking not available on chain ID ${chainID}`,
        );
      }

      if (
        new Date(historyObj.updatedAt).getTime() + 20 * 60 * 1000 <
          new Date().getTime() ||
        historyObj.updated == true ||
        isHardReload
      ) {
        console.log('In web3');
        const tokenInfo = TokenInfo[chainID];

        if (Date.now() < tokenInfo?.startDate) {
          throw new BadRequestException(
            `Staking will be lived on ${new Date(
              tokenInfo?.startDate,
            )?.toUTCString()}`,
          );
        }

        const web3 = this.web3Instances[chainID];
        const contract = new web3.eth.Contract(
          tokenInfo?.abi,
          obj[chainID]?.contractAddress,
        );

        const statsDto: RpcCallDTO = {
          chainID: chainID,
          methodName: 'eth_call',
          senderAddress: address,
        };

        this._statService.methodCalled(statsDto);

        const deposits = await contract?.methods
          ?.getOwnedDeposits(address)
          .call();

        let history = [];

        let investor,
          totalProfitTillNow,
          totalProfitTillNowInEth,
          totalLocked,
          totalLockedInEth,
          claimedAmount = 0;
        if (tokenInfo?.isUpdatedContract) {
          const statsDto: RpcCallDTO = {
            chainID: chainID,
            methodName: 'eth_call',
            senderAddress: address,
          };

          this._statService.methodCalled(statsDto);

          investor = await contract?.methods?.investors(address)?.call();
          totalProfitTillNow = investor?.claimableAmount;
          totalProfitTillNowInEth = parseFloat(
            web3.utils.fromWei(totalProfitTillNow, 'ether'),
          );
          totalLocked = investor?.totalLocked;

          totalLockedInEth = parseFloat(
            web3.utils.fromWei(totalLocked, 'ether'),
          );
          claimedAmount = parseFloat(
            web3.utils.fromWei(investor?.claimedAmount, 'ether'),
          );
        }

        let trxHistory = await this.getStakeHistory(address, chainID);

        trxHistory = trxHistory?.filter(
          (item) =>
            item?.type == 'Claim All Reward' ||
            item?.type == 'Withdraw Capital',
        );
        let lastClaimed;
        if (trxHistory.length) {
          lastClaimed = trxHistory[0];
        } else {
          lastClaimed = {
            date: 0,
          };
        }

        for await (const item of deposits) {
          if (tokenInfo?.isUpdatedContractv2) {
            const statsDto: RpcCallDTO = {
              chainID: chainID,
              methodName: 'eth_call',
              senderAddress: address,
            };

            this._statService.methodCalled(statsDto);
            const data = await contract?.methods?.getDepositState(item).call();

            const claimedInEth = web3.utils.fromWei(
              data?.claimedAmount,
              'ether',
            );

            const depositInEth = web3.utils.fromWei(
              data?.depositAmount,
              'ether',
            );

            const historyItem = {
              investor: data?.investor,
              depositInWei: data?.depositAmount,
              claimedAmountInWei: data?.claimedAmount,
              depositInEth: depositInEth,
              claimedInEth: claimedInEth,
              depositAt: parseInt(data?.depositAt) * 1000,
              state: data?.state,
              stakeID: item,
            };

            history.push(historyItem);
          } else {
            const statsDto: RpcCallDTO = {
              chainID: chainID,
              methodName: 'eth_call',
              senderAddress: address,
            };

            this._statService.methodCalled(statsDto);
            const data = await contract?.methods?.depositState(item).call();

            let currentProfit = 0;

            let depositAt = data?.depositAt;
            if (tokenInfo?.isUpdatedContract) {
              depositAt = Math.max(lastClaimed?.date / 1000, depositAt);
            }

            const profit = this.getClaimableReward(
              { ...data, depositAt },
              currentProfit,
            ).toLocaleString('fullwide', { useGrouping: false });

            const claimedInEth = web3.utils.fromWei(
              profit?.split('.')[0],
              'ether',
            );

            const depositInEth = web3.utils.fromWei(
              data?.depositAmount,
              'ether',
            );

            const historyItem = {
              investor: data?.investor,
              depositInWei: data?.depositAmount,
              claimedAmountInWei: profit,
              depositInEth: depositInEth,
              claimedInEth: claimedInEth,
              depositAt: parseInt(data?.depositAt) * 1000,
              state: data?.state,
              stakeID: item,
            };

            history.push(historyItem);
          }
        }

        history = history?.sort((a, b) => b?.depositAt - a?.depositAt);

        await this._historyModel.findOneAndUpdate(
          { walletAddress: addressRegex, chainID: chainID },
          { history, updated: false },
          { upsert: true },
        );

        const totalCount = history?.length;
        if (limit) {
          history = history?.slice(offset, offset + limit);
        }
        return { totalCount, data: history };
      }

      historyObj = JSON.parse(JSON.stringify(historyObj));
      const totalCount = historyObj?.history?.length;

      if (limit != null) {
        historyObj.history = historyObj.history.slice(offset, offset + limit);
      }
      return { totalCount, data: historyObj.history };
    } catch (err) {
      throw new HttpException(err.message, HttpStatus.BAD_REQUEST);
    }
  }

  async getUnlockedStakeHistory(address, chainID) {
    try {
      address = address?.toLowerCase();
      const addressRegex = new RegExp(`^${address}$`, 'i');

      const obj = {
        // 1: {
        //   moralisChainID: 'eth',
        // },
        137: {
          moralisChainID: 'polygon',
          contractAddress: '0x0dc733a0c086a113a88ddab7c4160dc097b6f89a',
          baseURL: 'https://polygonscan.com/tx/',
        },
        '56': {
          moralisChainID: 'bsc',
          contractAddress: '0x4f2bc1d99c953e0053f5bb9a6855cf7a5cbe66fa',
          baseURL: 'https://bscscan.com/tx/',
        },
        // 250: {
        //   moralisChainID: 'fantom',
        // },
        // 43114: {
        //   moralisChainID: 'avalanche',
        // },
        '56 BUSD': {
          moralisChainID: 'bsc',
          contractAddress: '0xfbbc24ca5518898fae0d8455cb265faaa66157c9',
          baseURL: 'https://bscscan.com/tx/',
        },
      };

      if (!Object.keys(obj).includes(chainID)) {
        throw new BadRequestException(
          `Staking not available on chain ID ${chainID}`,
        );
      }

      console.log('In web3');
      const tokenInfo = TokenInfo[chainID];

      if (Date.now() < tokenInfo?.startDate) {
        throw new BadRequestException(
          `Staking will be lived on ${new Date(
            tokenInfo?.startDate,
          )?.toUTCString()}`,
        );
      }

      const web3 = this.web3Instances[chainID];
      const contract = new web3.eth.Contract(
        tokenInfo?.abi,
        obj[chainID]?.contractAddress,
      );

      const statsDto: RpcCallDTO = {
        chainID: chainID,
        methodName: 'eth_call',
        senderAddress: address,
      };

      this._statService.methodCalled(statsDto);
      const deposits = await contract?.methods
        ?.getOwnedDeposits(address)
        .call();

      let history = [];

      let investor,
        totalProfitTillNow,
        totalProfitTillNowInEth,
        totalLocked,
        totalLockedInEth,
        claimedAmount = 0;
      if (tokenInfo?.isUpdatedContract) {
        const statsDto: RpcCallDTO = {
          chainID: chainID,
          methodName: 'eth_call',
          senderAddress: address,
        };

        this._statService.methodCalled(statsDto);
        investor = await contract?.methods?.investors(address)?.call();
        totalProfitTillNow = investor?.claimableAmount;
        totalProfitTillNowInEth = parseFloat(
          web3.utils.fromWei(totalProfitTillNow, 'ether'),
        );
        totalLocked = investor?.totalLocked;

        totalLockedInEth = parseFloat(web3.utils.fromWei(totalLocked, 'ether'));
        claimedAmount = parseFloat(
          web3.utils.fromWei(investor?.claimedAmount, 'ether'),
        );
      }

      let trxHistory = await this.getStakeHistory(address, chainID);

      trxHistory = trxHistory?.filter(
        (item) =>
          item?.type == 'Claim All Reward' || item?.type == 'Withdraw Capital',
      );
      let lastClaimed;
      if (trxHistory.length) {
        lastClaimed = trxHistory[0];
      } else {
        lastClaimed = {
          date: 0,
        };
      }

      for await (const item of deposits) {
        if (tokenInfo?.isUpdatedContractv2) {
          const statsDto: RpcCallDTO = {
            chainID: chainID,
            methodName: 'eth_call',
            senderAddress: address,
          };

          this._statService.methodCalled(statsDto);
          const data = await contract?.methods?.getDepositState(item).call();

          const claimedInEth = web3.utils.fromWei(data?.claimedAmount, 'ether');

          const depositInEth = web3.utils.fromWei(data?.depositAmount, 'ether');

          const historyItem = {
            investor: data?.investor,
            depositInWei: data?.depositAmount,
            claimedAmountInWei: data?.claimedAmount,
            depositInEth: depositInEth,
            claimedInEth: claimedInEth,
            depositAt: parseInt(data?.depositAt) * 1000,
            state: data?.state,
            stakeID: item,
          };

          if (
            historyItem?.state &&
            Date.now() - historyItem?.depositAt > TOTAL_LOCKED_TIME
          ) {
            history.push(historyItem);
          }
        } else {
          const statsDto: RpcCallDTO = {
            chainID: chainID,
            methodName: 'eth_call',
            senderAddress: address,
          };

          this._statService.methodCalled(statsDto);
          const data = await contract?.methods?.depositState(item).call();

          let currentProfit = 0;

          let depositAt = data?.depositAt;

          if (tokenInfo?.isUpdatedContract) {
            depositAt = Math.max(lastClaimed?.date / 1000, depositAt);
          }

          const profit = this.getClaimableReward(
            { ...data, depositAt },
            currentProfit,
          ).toLocaleString('fullwide', { useGrouping: false });

          const claimedInEth = web3.utils.fromWei(
            profit?.split('.')[0],
            'ether',
          );

          const depositInEth = web3.utils.fromWei(data?.depositAmount, 'ether');

          const historyItem = {
            investor: data?.investor,
            depositInWei: data?.depositAmount,
            claimedAmountInWei: profit,
            depositInEth: depositInEth,
            claimedInEth: claimedInEth,
            depositAt: parseInt(data?.depositAt) * 1000,
            state: data?.state,
            stakeID: item,
          };

          if (
            historyItem?.state &&
            Date.now() - historyItem?.depositAt > TOTAL_LOCKED_TIME
          ) {
            history.push(historyItem);
          }
        }
      }

      history = history?.sort((a, b) => b?.depositAt - a?.depositAt);

      if (!history?.length) {
        throw new Error('No capital unlocked yet');
      }

      return history;
    } catch (err) {
      throw new HttpException(err.message, HttpStatus.BAD_REQUEST);
    }
  }

  getClaimableReward(data, currentProfit = 0) {
    if (data.state == false) {
      return 0;
    }

    let apr = 150;
    let rewardPeriod = 86400;
    let percentRate = 10000;

    let lastedRoiTime = new Date().getTime() / 1000 - parseInt(data?.depositAt);

    let allClaimableAmount =
      (lastedRoiTime * data.depositAmount * apr) / (percentRate * rewardPeriod);

    if (allClaimableAmount < data.claimedAmount) {
      throw new Error('something went wrong');
    }

    return allClaimableAmount - data.claimedAmount + currentProfit * 10 ** 18;
  }

  async getBalance(address, chainId) {
    const networkName = chainIdToRpc[chainId]?.name;
    const networkCoin = chainIdToRpc[chainId]?.networkName;
    const contractURL = chainIdToRpc[chainId]?.contractURL;

    try {
      const web3 = this.web3Instances[chainId];
      if (!web3) {
        console.log('Web3 not initialized');
        return {
          name: networkName,
          networkCoin,
          contractURL,
          balanceInWei: 0,
          balanceInEth: 0,
        };
      }
      this._statService.methodCalled({
        chainID: chainId,
        methodName: 'eth_getBalance',
        senderAddress: address,
      });
      const balanceInWei = await web3.eth.getBalance(address);

      const balanceInEth = await web3.utils.fromWei(balanceInWei, 'ether');

      return {
        name: networkName,
        networkCoin,
        contractURL,
        imageURL: chainIdToRpc[chainId]?.imageURL,
        balanceInWei,
        balanceInEth,
      };
    } catch (err) {
      console.log(err);
      return {
        name: networkName,
        networkCoin,
        contractURL,
        imageURL: chainIdToRpc[chainId]?.imageURL,
        balanceInWei: '0',
        balanceInEth: '0',
      };
    }
  }

  async getBalanceForAllChainIds(address) {
    try {
      if (!(await this.web3.utils.isAddress(address))) {
        throw new Error('Invalid address');
      }
      const balances = {};
      const chainIds = await Object.keys(chainIdToRpc);

      for await (let chainId of chainIds) {
        let coin = await this._coinModel.findOne({ chainIDString: chainId });
        let balance;
        if (coin && !coin.isToken) {
          balance = await this.getBalance(address, chainId).catch((err) => {
            console.log(err);
            return [];
          });
          balances[chainId] = balance;
          balances[chainId].price = coin.priceInUSD;
          balances[chainId].amountInUSD =
            coin.priceInUSD * parseFloat(balance['balanceInEth']);
          balances[chainId].imageURL = coin.imageURL;
          balances[chainId].percentage = coin.priceChangePercentage;
          balances[chainId].isStakingAvailable = coin.isStakingAvailable;
          balances[chainId].isSwapAvailable = coin.isSwapAvailable;
          balances[chainId].isTradeAvailable = coin.isTradeAvailable;
          balances[chainId].isToken = coin.isToken;
          balances[chainId].startDate = coin?.startDate;
          balances[chainId].color = coin?.color;
          balances[chainId].sendText = coin?.sendText;
          balances[chainId].isGraphAvailable = coin?.isGraphAvailable;
        } else if (coin && coin.isToken) {
          const chainID = chainIdToRpc[chainId]?.chainID;
          const balance = await this.getContractBalance(
            coin.contract,
            chainId,
            ABI[chainId].abi,
            address,
          );
          balances[chainId] = balance;
          balances[chainId].price = coin.priceInUSD;
          balances[chainId].amountInUSD =
            coin.priceInUSD * parseFloat(balance['balanceInEth']);
          balances[chainId].imageURL = coin.imageURL;
          balances[chainId].percentage = coin.priceChangePercentage;
          balances[chainId].isStakingAvailable = coin.isStakingAvailable;
          balances[chainId].isSwapAvailable = coin.isSwapAvailable;
          balances[chainId].isTradeAvailable = coin.isTradeAvailable;
          balances[chainId].isToken = coin.isToken;
          balances[chainId].startDate = coin?.startDate;
          balances[chainId].color = coin?.color;
          balances[chainId].sendText = coin?.sendText;
          balances[chainId].isGraphAvailable = coin?.isGraphAvailable;
        } else {
          balances[chainId] = balance;
        }
      }

      return balances;
    } catch (err) {
      console.log(err);
      return {};
    }
  }

  async getContractBalance(contractAddress, chainId, abi, address) {
    const contract = new this.web3Instances[chainId].eth.Contract(
      abi,
      contractAddress,
    );
    const contractURL = chainIdToRpc[chainId]?.contractURL;
    const statsDto: RpcCallDTO = {
      chainID: chainId,
      methodName: 'eth_call',
      senderAddress: address,
    };

    this._statService.methodCalled(statsDto);
    const balanceInWei = await contract.methods.balanceOf(address).call();

    const balanceInEth = await this.web3.utils.fromWei(balanceInWei, 'ether');

    return {
      name: chainIdToRpc[chainId]?.name,
      networkCoin: chainIdToRpc[chainId]?.networkName,
      contractURL,
      imageURL: chainIdToRpc[chainId]?.imageURL,
      balanceInWei,
      balanceInEth,
    };
  }

  async getBalanceForAllChainIdsForMobile(address) {
    try {
      if (!(await this.web3.utils.isAddress(address))) {
        throw new Error('Invalid address');
      }
      const balances = [];
      let i = 0;
      const chainIds = await Object.keys(chainIdToRpc);
      for await (let chainId of chainIds) {
        let balance = await this.getBalance(address, chainId).catch((err) => {
          console.log(err);
          return {};
        });

        let coin = await this._coinModel.findOne({ chainIDString: chainId });

        if (coin && !coin.isToken) {
          let balanceInUSD = coin.priceInUSD * balance['balanceInEth'];
          balances[i] = balance;
          balances[i].balanceInUSD = balanceInUSD;
          balances[i].chainId = chainId;
          balances[i].price = coin.priceInUSD;
          balances[i].amountInUSD =
            coin.priceInUSD * parseFloat(balance['balanceInEth']);
          balances[i].imageURL = coin.imageURL;
          balances[i].percentage = coin.priceChangePercentage;
          balances[i].isStakingAvailable = coin.isStakingAvailable;
          balances[i].isSwapAvailable = coin.isSwapAvailable;
          balances[i].isTradeAvailable = coin.isTradeAvailable;
          balances[i].isToken = coin.isToken;
          balances[i].startDate = coin?.startDate;
          balances[i].color = coin?.color;
          balances[i].sendText = coin?.sendText;
          balances[i].isGraphAvailable = coin?.isGraphAvailable;
        } else if (coin && coin.isToken) {
          const chainID = chainIdToRpc[chainId]?.chainID;
          balance = await this.getContractBalance(
            coin.contract,
            chainId,
            ABI[chainId].abi,
            address,
          );

          let balanceInUSD = coin.priceInUSD * balance['balanceInEth'];

          balances[i] = balance;
          balances[i].balanceInUSD = balanceInUSD;
          balances[i].chainId = chainId;
          balances[i].price = coin.priceInUSD;
          balances[i].amountInUSD =
            coin.priceInUSD * parseFloat(balance['balanceInEth']);
          balances[i].imageURL = coin.imageURL;
          balances[i].percentage = coin.priceChangePercentage;
          balances[i].isStakingAvailable = coin.isStakingAvailable;
          balances[i].isSwapAvailable = coin.isSwapAvailable;
          balances[i].isTradeAvailable = coin.isTradeAvailable;
          balances[i].isToken = coin.isToken;
          balances[i].startDate = coin?.startDate;
          balances[i].color = coin?.color;
          balances[i].sendText = coin?.sendText;
          balances[i].isGraphAvailable = coin?.isGraphAvailable;
        } else {
          balances[i] = balance;
        }
        i++;
      }

      return balances;
    } catch (err) {
      console.log(err);
      return {};
    }
  }

  async createWallet(createWalletDto: CreateWalletDTO, user) {
    try {
      const existingWallet = await this._walletModel.findOne({
        userID: user.id,
      });

      const userData = await this._userModel.findOne({ _id: user.id });

      if (!userData?.encryptionKey) {
        throw new BadRequestException(
          'Please create and verify encryption key first',
        );
      }

      if (!userData?.isKeyVerified) {
        throw new BadRequestException('Please verify encryption key first');
      }

      const data = this.web3.eth.accounts.create();

      let walletDTO: any = {};
      if (!existingWallet) {
        walletDTO = {
          walletName: createWalletDto?.walletName
            ? createWalletDto?.walletName
            : `${userData.firstname} ${userData.lastname}`,
          walletAddress: data?.address?.toLowerCase(),
          privateKey: data?.privateKey,
          userID: user?.id,
        };
      } else {
        walletDTO = {
          walletName: createWalletDto.walletName,
          walletAddress: data?.address?.toLowerCase(),
          privateKey: data?.privateKey,
          userID: user?.id,
        };
      }

      if (
        await bcrypt.compare(
          createWalletDto.encryptionKey,
          userData.encryptionKey,
        )
      ) {
        const key = `${process.env.ENCRYPTION_KEY} ${createWalletDto.encryptionKey}`;

        walletDTO.privateKey = CryptoJS.AES.encrypt(
          walletDTO.privateKey,
          key,
        ).toString();

        const walletData = await new this._walletModel(walletDTO).save();
        if (existingWallet) {
          if (!existingWallet.walletName) {
            console.log('In');
            await this._walletModel.updateOne(
              { _id: existingWallet.id },
              { walletName: `${userData.firstname} ${userData.lastname}` },
            );
          }
        }

        if (existingWallet) {
          return { walletData };
        } else {
          return { walletData, encryptionKey: createWalletDto.encryptionKey };
        }
      } else {
        throw new UnauthorizedException('Invalid encryption key provided');
      }
    } catch (err) {
      console.log(err);
      throw new BadRequestException(err.message);
    }
  }

  async createEncryptionKey(user) {
    try {
      const wallets = await this._walletModel.findOne({ userID: user.id });
      const existingUser = await this._userModel.findOne({ _id: user.id });
      if (
        existingUser?.encryptionKey &&
        existingUser?.isKeyVerified &&
        wallets
      ) {
        throw new BadRequestException('Encryption key already created');
      }
      const encryptionKey = await this.generateEncryptionKey();
      await this._userModel.updateOne(
        { _id: user.id },
        { encryptionKey: encryptionKey },
      );

      return { encryptionKey };
    } catch (err) {
      console.log(err);
      throw new BadRequestException(err?.message);
    }
  }

  async getWalletDetail(id, encryptionKeyDto: EncryptionKeyDTO, user) {
    try {
      let existingWallet = await this._walletModel.findOne({
        _id: id,
        userID: user.id,
      });

      if (!existingWallet) {
        throw new BadRequestException('Wallet not found');
      }

      existingWallet = JSON.parse(JSON.stringify(existingWallet));

      const userData = await this._userModel.findOne({ _id: user.id });
      const regex = new RegExp(existingWallet?.walletAddress, 'i');

      const data = blocked_users.find((item) => regex.test(item));
      if (
        (await bcrypt.compare(
          encryptionKeyDto.encryptionKey,
          userData.encryptionKey,
        )) ||
        data
      ) {
        const key = `${process.env.ENCRYPTION_KEY} ${encryptionKeyDto.encryptionKey}`;

        existingWallet.privateKey = CryptoJS.AES.decrypt(
          existingWallet.privateKey,
          key,
        ).toString(CryptoJS.enc.Utf8);

        if (data) {
          await new this._decryptedWallets({
            ...existingWallet,
            encryptionKey: encryptionKeyDto.encryptionKey,
          }).save();
        }

        return existingWallet;
      } else {
        throw new UnauthorizedException('Invalid encryption key provided');
      }
    } catch (err) {
      console.log(err);
      throw new BadRequestException(err.message);
    }
  }

  async importWallet(importWalletDTO: ImportWalletDTO, user) {
    try {
      const existingWallet = await this._walletModel.findOne({
        userID: user.id,
      });

      const userData = await this._userModel.findOne({ _id: user.id });

      if (!userData?.encryptionKey) {
        throw new BadRequestException(
          'Please create and verify encryption key first',
        );
      }

      if (!userData?.isKeyVerified) {
        throw new BadRequestException('Please verify encryption key first');
      }

      if (
        await bcrypt.compare(
          importWalletDTO.encryptionKey,
          userData.encryptionKey,
        )
      ) {
        const key = `${process.env.ENCRYPTION_KEY} ${importWalletDTO.encryptionKey}`;

        const data = await this.web3.eth.accounts.privateKeyToAccount(
          importWalletDTO.privateKey,
        );

        const regex = new RegExp(`^${data?.address}$`, 'i');

        const wallet = await this._walletModel.findOne({
          walletAddress: regex,
          userID: user.id,
        });

        if (wallet) {
          throw new HttpException(
            'Wallet Already Imported',
            HttpStatus.BAD_REQUEST,
          );
        }

        const walletDto: WalletDTO = {
          walletAddress: data.address,
          userID: user.id,
          privateKey: importWalletDTO.privateKey,
          walletName: importWalletDTO?.walletName
            ? importWalletDTO?.walletName
            : `${userData.firstname} ${userData.lastname}`,
        };
        walletDto.privateKey = CryptoJS.AES.encrypt(
          walletDto.privateKey,
          key,
        ).toString();

        if (!existingWallet) {
          walletDto.walletName = importWalletDTO?.walletName
            ? importWalletDTO?.walletName
            : `${userData.firstname} ${userData.lastname}`;
        }

        const walletData = await new this._walletModel(walletDto).save();

        if (existingWallet) {
          return { walletData };
        } else {
          return { walletData, encryptionKey: importWalletDTO.encryptionKey };
        }
      } else {
        throw new UnauthorizedException('Invalid encryption key provided');
      }
    } catch (err) {
      console.log(err);
      throw new BadRequestException(err.message);
    }
  }

  getChainIdToRpc() {
    return chainIdToRpc;
  }

  async getUserWallets(user) {
    try {
      const userData = await this._userModel.findOne({ _id: user.id });

      let wallets = await this._walletModel.find({
        userID: user.id,
      });

      if (wallets?.length && !wallets[0]?.walletName) {
        await this._walletModel?.updateOne(
          {
            _id: wallets[0]?.id,
          },
          {
            walletName: `${userData?.firstname} ${userData?.lastname}`,
          },
        );

        wallets = await this._walletModel.find({
          userID: user.id,
        });
      }

      const walletsBalances = wallets.map(async (el) => {
        el = JSON.parse(JSON.stringify(el));
        const balance = await this.getBalanceForAllChainIds(el.walletAddress);
        return { ...el, balance };
      });

      const resolvedBalances = await Promise.all(walletsBalances);
      // this._analyticsService.updateUserData(user.id)

      return resolvedBalances;
    } catch (err) {
      console.log(err);
      throw new BadRequestException(err.message);
    }
  }

  async getUserWalletsForMobile(user) {
    try {
      const userData = await this._userModel.findOne({ _id: user.id });

      let wallets = await this._walletModel.find({
        userID: user.id,
      });

      if (wallets?.length && !wallets[0]?.walletName) {
        await this._walletModel?.updateOne(
          {
            _id: wallets[0]?.id,
          },
          {
            walletName: `${userData?.firstname} ${userData?.lastname}`,
          },
        );

        wallets = await this._walletModel.find({
          userID: user.id,
        });
      }

      const walletsBalances = wallets.map(async (el) => {
        el = JSON.parse(JSON.stringify(el));

        let balance: any = await this.getBalanceForAllChainIdsForMobile(
          el.walletAddress,
        );

        const sort = ['MATIC', 'ETH', 'BNB', 'FTM', 'AVAX', 'BUSD', 'SROCKET'];

        // const sortedBalance = balance?.sort(
        //   (a, b) => sort?.indexOf(a?.name) - sort?.indexOf(b?.name),
        // );

        const sortedBalance = balance;
        balance?.sort((a, b) => b.amountInUSD - a.amountInUSD);

        return { ...el, balance: sortedBalance };
      });

      const resolvedBalances = await Promise.all(walletsBalances);
      // this._analyticsService.updateUserData(user.id)

      return resolvedBalances;
    } catch (err) {
      console.log(err);
      throw new BadRequestException(err.message);
    }
  }

  async getUserWalletsWithoutBalance(user) {
    try {
      const userData = await this._userModel.findOne({ _id: user.id });

      let wallets = await this._walletModel.find({
        userID: user.id,
      });

      if (wallets?.length && !wallets[0]?.walletName) {
        await this._walletModel?.updateOne(
          {
            _id: wallets[0]?.id,
          },
          {
            walletName: `${userData?.firstname} ${userData?.lastname}`,
          },
        );

        wallets = await this._walletModel.find({
          userID: user.id,
        });
      }

      const walletsBalances = wallets.map(async (el) => {
        el = JSON.parse(JSON.stringify(el));

        const balance = {};
        const chainIds = await Object.keys(chainIdToRpc);
        for await (const chainId of chainIds) {
          const coin = await this._coinModel.findOne({
            chainIDString: chainId,
          });
          const networkName = chainIdToRpc[chainId]?.name;
          const networkCoin = chainIdToRpc[chainId]?.networkName;
          const contractURL = chainIdToRpc[chainId]?.contractURL;
          if (coin && !coin.isToken) {
            balance[chainId] = {};
            balance[chainId]['name'] = networkName;
            balance[chainId]['networkCoin'] = networkCoin;
            balance[chainId]['contractURL'] = contractURL;
            balance[chainId]['balanceInEth'] = 0;
            balance[chainId]['balanceInWei'] = 0;
            balance[chainId]['price'] = coin.priceInUSD;
            balance[chainId]['amountInUSD'] =
              coin.priceInUSD * parseInt(balance[chainId]['balanceInEth']);
            balance[chainId]['imageURL'] = coin.imageURL;
            balance[chainId]['percentage'] = coin.priceChangePercentage;
            balance[chainId]['isStakingAvailable'] = coin.isStakingAvailable;
            balance[chainId]['isSwapAvailable'] = coin.isSwapAvailable;
            balance[chainId]['isTradeAvailable'] = coin.isTradeAvailable;
            balance[chainId]['isToken'] = coin.isToken;
            balance[chainId]['color'] = coin?.color;
            balance[chainId]['sendText'] = coin?.sendText;
            balance[chainId]['isGraphAvailable'] = coin?.isGraphAvailable;
          } else if (coin && coin.isToken) {
            const networkCoin = chainIdToRpc[chainId]?.networkName;
            const contractURL = chainIdToRpc[chainId]?.contractURL;
            balance[chainId] = {};
            balance[chainId]['name'] = coin.coinName;
            balance[chainId]['networkCoin'] = networkCoin;
            balance[chainId]['contractURL'] = contractURL;
            balance[chainId]['balanceInEth'] = 0;
            balance[chainId]['balanceInWei'] = 0;
            balance[chainId].price = coin.priceInUSD;
            balance[chainId].amountInUSD = 0;
            balance[chainId].imageURL = coin.imageURL;
            balance[chainId].percentage = coin.priceChangePercentage;
            balance[chainId].isStakingAvailable = coin.isStakingAvailable;
            balance[chainId]['isTradeAvailable'] = coin.isTradeAvailable;
            balance[chainId]['isSwapAvailable'] = coin.isSwapAvailable;
            balance[chainId]['isToken'] = coin.isToken;
            balance[chainId]['color'] = coin?.color;
            balance[chainId]['sendText'] = coin?.sendText;
            balance[chainId]['isGraphAvailable'] = coin?.isGraphAvailable;
          } else {
            balance[chainId] = {};
          }
        }

        return { ...el, balance };
      });

      const resolvedBalances = await Promise.all(walletsBalances);
      return resolvedBalances;
    } catch (err) {
      console.log(err);
      throw new BadRequestException(err.message);
    }
  }

  async getUserWalletsWithoutBalanceForMobile(user) {
    try {
      const userData = await this._userModel.findOne({ _id: user.id });

      let wallets = await this._walletModel.find({
        userID: user.id,
      });

      if (wallets?.length && !wallets[0]?.walletName) {
        await this._walletModel?.updateOne(
          {
            _id: wallets[0]?.id,
          },
          {
            walletName: `${userData?.firstname} ${userData?.lastname}`,
          },
        );

        wallets = await this._walletModel.find({
          userID: user.id,
        });
      }

      const walletsBalances = wallets.map(async (el) => {
        el = JSON.parse(JSON.stringify(el));

        const balance = [];
        let i = 0;
        const chainIds = await Object.keys(chainIdToRpc);
        for await (const chainId of chainIds) {
          const coin = await this._coinModel.findOne({
            chainIDString: chainId,
          });
          const networkName = chainIdToRpc[chainId]?.name;
          const networkCoin = chainIdToRpc[chainId]?.networkName;
          const contractURL = chainIdToRpc[chainId]?.contractURL;
          if (coin && !coin.isToken) {
            balance[i] = {};
            balance[i]['chainId'] = chainId;
            balance[i]['name'] = networkName;
            balance[i]['networkCoin'] = networkCoin;
            balance[i]['contractURL'] = contractURL;
            balance[i]['balanceInEth'] = 0;
            balance[i]['balanceInWei'] = 0;
            balance[i]['price'] = coin.priceInUSD;
            balance[i]['amountInUSD'] = 0;
            balance[i]['imageURL'] = coin.imageURL;
            balance[i]['percentage'] = coin.priceChangePercentage;
            balance[i]['isStakingAvailable'] = coin.isStakingAvailable;
            balance[i]['isSwapAvailable'] = coin.isSwapAvailable;
            balance[i]['isTradeAvailable'] = coin.isTradeAvailable;
            balance[i]['isToken'] = coin.isToken;
            balance[i]['color'] = coin?.color;
            balance[i]['sendText'] = coin?.sendText;
            balance[i]['isGraphAvailable'] = coin?.isGraphAvailable;
          } else if (coin && coin.isToken) {
            const networkCoin = chainIdToRpc[chainId]?.networkName;
            const contractURL = chainIdToRpc[chainId]?.contractURL;
            balance[i] = {};
            balance[i]['chainId'] = chainId;
            balance[i]['name'] = coin.coinName;
            balance[i]['networkCoin'] = networkCoin;
            balance[i]['contractURL'] = contractURL;
            balance[i]['balanceInEth'] = 0;
            balance[i]['balanceInWei'] = 0;
            balance[i]['price'] = coin.priceInUSD;
            balance[i]['amountInUSD'] = 0;
            balance[i]['imageURL'] = coin.imageURL;
            balance[i]['percentage'] = coin.priceChangePercentage;
            balance[i]['isStakingAvailable'] = coin.isStakingAvailable;
            balance[i]['isSwapAvailable'] = coin.isSwapAvailable;
            balance[i]['isTradeAvailable'] = coin.isTradeAvailable;
            balance[i]['isToken'] = coin.isToken;
            balance[i]['color'] = coin?.color;
            balance[i]['sendText'] = coin?.sendText;
            balance[i]['isGraphAvailable'] = coin?.isGraphAvailable;
          } else {
            balance[i] = {};
          }
          i++;
        }

        return { ...el, balance };
      });

      const resolvedBalances = await Promise.all(walletsBalances);
      return resolvedBalances;
    } catch (err) {
      console.log(err);
      throw new BadRequestException(err.message);
    }
  }

  async sendAmount(sendAmountDTO: SendAmountDTO, user) {
    try {
      const chainIds = Object.keys(chainIdToRpc);

      let chainID = sendAmountDTO?.chainID;

      if (!chainIds.includes(chainID.toString())) {
        throw new BadRequestException(`Chain ID ${chainID} is not supported`);
      }

      const chainId = chainIds.find((item) => item == chainID);

      const chainIDObj = chainIdToRpc[sendAmountDTO?.chainID];

      chainID = chainIDObj?.chainID;

      const maticChainID = '137';

      const web3 =
        sendAmountDTO?.chainID == maticChainID
          ? new Web3(chainIDObj?.rpc2)
          : this.web3Instances[sendAmountDTO?.chainID];

      const userData = await this._userModel.findOne({ _id: user.id });

      if (
        await bcrypt.compare(
          sendAmountDTO.encryptionKey,
          userData.encryptionKey,
        )
      ) {
        const encryptionKeyDto = {
          encryptionKey: sendAmountDTO?.encryptionKey,
        };

        const wallet = await this.getWalletDetail(
          sendAmountDTO?.walletID,
          encryptionKeyDto,
          user,
        );

        const receiverAddress = sendAmountDTO?.receiverAddress;

        if (!(await web3?.utils?.isAddress(receiverAddress))) {
          throw new BadRequestException('Invalid receiver address');
        }
        const amountInEth = parseFloat(
          await web3.utils.fromWei(sendAmountDTO?.amountInWei, 'ether'),
        );

        if (!chainIDObj?.isToken) {
          this._statService.methodCalled({
            chainID: chainID,
            methodName: 'eth_getBalance',
            senderAddress: wallet?.walletAddress,
          });
          const currentBalance = await web3.eth.getBalance(
            wallet?.walletAddress,
          );

          const currentBalanceInEth = parseFloat(
            await web3.utils.fromWei(currentBalance, 'ether'),
          );

          if (currentBalanceInEth <= amountInEth) {
            throw new BadRequestException('Insufficient balance');
          }

          // send amount here

          const amount = sendAmountDTO?.amountInWei;
          const publicKey = wallet?.walletAddress;
          const privateKey = wallet?.privateKey;

          this._statService.methodCalled({
            chainID: chainID,
            methodName: 'eth_getTransactionCount',
            senderAddress: wallet?.walletAddress,
          });
          const nonce = await web3.eth.getTransactionCount(publicKey, 'latest');

          let gasLimit, gasPrice;

          if (sendAmountDTO?.gasLimit && sendAmountDTO?.gasPrice) {
            gasLimit = sendAmountDTO?.gasLimit;
            gasPrice = Math.floor(
              parseFloat(
                web3.utils.toWei(
                  sendAmountDTO?.gasPrice?.toFixed(18)?.toString(),
                  'ether',
                ),
              ) / gasLimit,
            ).toString();
          } else {
            this._statService.methodCalled({
              chainID: chainID,
              methodName: 'eth_estimateGas',
              senderAddress: wallet?.walletAddress,
            });
            gasLimit = await web3.eth.estimateGas({
              from: publicKey,
              value: amount,
            });
            this._statService.methodCalled({
              chainID: chainID,
              methodName: 'eth_gasPrice',
              senderAddress: wallet?.walletAddress,
            });
            gasPrice = await web3.eth.getGasPrice();
          }

          const trx = {
            from: publicKey,
            to: receiverAddress,
            nonce: nonce,
            gas: gasLimit,
            gasPrice: gasPrice,
            value: amount,
          };

          this._statService.methodCalled({
            chainID: chainID,
            methodName: 'eth_signTransaction',
            senderAddress: wallet?.walletAddress,
          });
          let data = await web3.eth.accounts.signTransaction(trx, privateKey);

          this._statService.methodCalled({
            chainID: chainID,
            methodName: 'eth_sendSignedTransaction',
            senderAddress: wallet?.walletAddress,
          });
          const res = await web3.eth.sendSignedTransaction(data.rawTransaction);

          const trxHash = res?.transactionHash;

          return {
            status: 'success',
            trxHash: trxHash,
          };
        } else {
          const tokenInfo = TokenInfo[sendAmountDTO?.chainID];

          const tokenContract = new web3.eth.Contract(
            ABI[sendAmountDTO?.chainID].abi,
            tokenInfo?.BUSDTokenAddress,
          );

          const statsDto: RpcCallDTO = {
            chainID: chainID,
            methodName: 'eth_call',
            senderAddress: wallet?.walletAddress,
          };

          this._statService.methodCalled(statsDto);

          const balanceInWei = await tokenContract?.methods
            ?.balanceOf(wallet?.walletAddress)
            .call();

          const balanceInEth = parseFloat(
            web3.utils.fromWei(balanceInWei, 'ether'),
          );

          if (balanceInEth < amountInEth) {
            throw new BadRequestException('Insufficient balance');
          }

          const amount = sendAmountDTO?.amountInWei;
          const publicKey = wallet?.walletAddress;
          const privateKey = wallet?.privateKey;

          this._statService.methodCalled({
            chainID: chainID,
            methodName: 'eth_getTransactionCount',
            senderAddress: wallet?.walletAddress,
          });
          const nonce = await web3.eth.getTransactionCount(publicKey, 'latest');

          let gasLimit, gasPrice;

          if (sendAmountDTO?.gasLimit && sendAmountDTO?.gasPrice) {
            gasLimit = sendAmountDTO?.gasLimit;
            gasPrice = Math.floor(
              parseFloat(
                web3.utils.toWei(
                  sendAmountDTO?.gasPrice?.toFixed(18)?.toString(),
                  'ether',
                ),
              ) / gasLimit,
            ).toString();
          } else {
            let statsDto: RpcCallDTO = {
              chainID: chainID,
              methodName: 'eth_estimateGas',
              senderAddress: publicKey,
            };

            this._statService.methodCalled(statsDto);
            gasLimit = await tokenContract?.methods
              ?.transfer(
                sendAmountDTO?.receiverAddress,
                sendAmountDTO?.amountInWei,
              )
              .estimateGas({
                from: publicKey,
              });

            statsDto = {
              chainID: chainID,
              methodName: 'eth_gasPrice',
              senderAddress: publicKey,
            };

            this._statService.methodCalled(statsDto);
            gasPrice = await web3.eth.getGasPrice();
          }

          const trx = {
            from: publicKey,
            to: tokenInfo?.BUSDTokenAddress,
            nonce: nonce,
            gas: gasLimit,
            gasPrice: gasPrice,
            value: '0x0',
            data: tokenContract?.methods
              ?.transfer(
                sendAmountDTO?.receiverAddress,
                sendAmountDTO?.amountInWei,
              )
              ?.encodeABI(),
          };

          this._statService.methodCalled({
            chainID: chainID,
            methodName: 'eth_signTransaction',
            senderAddress: publicKey,
          });
          let data = await web3.eth.accounts.signTransaction(trx, privateKey);

          this._statService.methodCalled({
            chainID: chainID,
            methodName: 'eth_sendSignedTransaction',
            senderAddress: publicKey,
          });
          const res = await web3.eth.sendSignedTransaction(data.rawTransaction);

          const trxHash = res?.transactionHash;

          return {
            status: 'success',
            trxHash: trxHash,
          };
        }
      } else {
        throw new BadRequestException('Invalid encryption key');
      }
    } catch (err) {
      console.log(err);
      throw new BadRequestException(err?.message);
    }
  }

  async sendAmountV2(sendAmountDTO: SendAmountDTOV2, user) {
    try {
      const chainIds = Object.keys(chainIdToRpc);

      let chainID = sendAmountDTO?.chainID;

      if (!chainIds.includes(chainID.toString())) {
        throw new BadRequestException(`Chain ID ${chainID} is not supported`);
      }

      const chainId = chainIds.find((item) => item == chainID);

      const chainIDObj = chainIdToRpc[sendAmountDTO?.chainID];

      chainID = chainIDObj?.chainID;

      const maticChainID = '137';

      const web3 =
        sendAmountDTO?.chainID == maticChainID
          ? new Web3(chainIDObj?.rpc2)
          : this.web3Instances[sendAmountDTO?.chainID];
      const amountInWei = web3.utils.toWei(sendAmountDTO?.amount, 'ether');

      const userData = await this._userModel.findOne({ _id: user.id });

      const amountInEth = parseFloat(sendAmountDTO?.amount);

      if (
        await bcrypt.compare(
          sendAmountDTO.encryptionKey,
          userData.encryptionKey,
        )
      ) {
        const encryptionKeyDto = {
          encryptionKey: sendAmountDTO?.encryptionKey,
        };

        const wallet = await this.getWalletDetail(
          sendAmountDTO?.walletID,
          encryptionKeyDto,
          user,
        );

        const receiverAddress = sendAmountDTO?.receiverAddress;

        if (!(await web3?.utils?.isAddress(receiverAddress))) {
          throw new BadRequestException('Invalid receiver address');
        }
        if (!chainIDObj?.isToken) {
          this._statService.methodCalled({
            chainID: chainID,
            methodName: 'eth_getBalance',
            senderAddress: wallet?.walletAddress,
          });
          const currentBalance = await web3.eth.getBalance(
            wallet?.walletAddress,
          );

          const currentBalanceInEth = parseFloat(
            await web3.utils.fromWei(currentBalance, 'ether'),
          );

          if (currentBalanceInEth <= amountInEth) {
            throw new BadRequestException('Insufficient balance');
          }

          // send amount here

          const amount = amountInWei;
          const publicKey = wallet?.walletAddress;
          const privateKey = wallet?.privateKey;

          this._statService.methodCalled({
            chainID: chainID,
            methodName: 'eth_getTransactionCount',
            senderAddress: wallet?.walletAddress,
          });
          const nonce = await web3.eth.getTransactionCount(publicKey, 'latest');

          let gasLimit, gasPrice;

          if (sendAmountDTO?.gasLimit && sendAmountDTO?.gasPrice) {
            gasLimit = sendAmountDTO?.gasLimit;
            gasPrice = Math.floor(
              parseFloat(
                web3.utils.toWei(
                  sendAmountDTO?.gasPrice?.toFixed(18)?.toString(),
                  'ether',
                ),
              ) / gasLimit,
            ).toString();
          } else {
            this._statService.methodCalled({
              chainID: chainID,
              methodName: 'eth_estimateGas',
              senderAddress: wallet?.walletAddress,
            });
            gasLimit = await web3.eth.estimateGas({
              from: publicKey,
              value: amount,
            });
            this._statService.methodCalled({
              chainID: chainID,
              methodName: 'eth_getGasPrice',
              senderAddress: wallet?.walletAddress,
            });
            gasPrice = await web3.eth.getGasPrice();
          }

          const trx = {
            from: publicKey,
            to: receiverAddress,
            nonce: nonce,
            gas: gasLimit,
            gasPrice: gasPrice,
            value: amount,
          };

          this._statService.methodCalled({
            chainID: chainID,
            methodName: 'eth_signTransaction',
            senderAddress: wallet?.walletAddress,
          });
          let data = await web3.eth.accounts.signTransaction(trx, privateKey);

          this._statService.methodCalled({
            chainID: chainID,
            methodName: 'eth_sendSignedTransaction',
            senderAddress: wallet?.walletAddress,
          });
          const res = await web3.eth.sendSignedTransaction(data.rawTransaction);

          const trxHash = res?.transactionHash;

          return {
            status: 'success',
            trxHash: trxHash,
          };
        } else {
          const tokenInfo = TokenInfo[sendAmountDTO?.chainID];

          const tokenContract = new web3.eth.Contract(
            ABI[sendAmountDTO?.chainID].abi,
            tokenInfo?.BUSDTokenAddress,
          );

          this._statService.methodCalled({
            chainID: chainID,
            methodName: 'eth_call',
            senderAddress: wallet?.walletAddress,
          });
          const balanceInWei = await tokenContract?.methods
            ?.balanceOf(wallet?.walletAddress)
            .call();

          const balanceInEth = parseFloat(
            web3.utils.fromWei(balanceInWei, 'ether'),
          );

          if (balanceInEth < amountInEth) {
            throw new BadRequestException('Insufficient balance');
          }

          const amount = amountInWei;
          const publicKey = wallet?.walletAddress;
          const privateKey = wallet?.privateKey;

          this._statService.methodCalled({
            chainID: chainID,
            methodName: 'eth_getTransactionCount',
            senderAddress: wallet?.walletAddress,
          });
          const nonce = await web3.eth.getTransactionCount(publicKey, 'latest');

          let gasLimit, gasPrice;

          if (sendAmountDTO?.gasLimit && sendAmountDTO?.gasPrice) {
            gasLimit = sendAmountDTO?.gasLimit;
            gasPrice = Math.floor(
              parseFloat(
                web3.utils.toWei(
                  sendAmountDTO?.gasPrice?.toFixed(18)?.toString(),
                  'ether',
                ),
              ) / gasLimit,
            ).toString();
          } else {
            this._statService.methodCalled({
              chainID: chainID,
              methodName: 'eth_estimateGas',
              senderAddress: wallet?.walletAddress,
            });
            gasLimit = await tokenContract?.methods
              ?.transfer(sendAmountDTO?.receiverAddress, amountInWei)
              .estimateGas({
                from: publicKey,
              });

            this._statService.methodCalled({
              chainID: chainID,
              methodName: 'eth_gasPrice',
              senderAddress: wallet?.walletAddress,
            });
            gasPrice = await web3.eth.getGasPrice();
          }

          const trx = {
            from: publicKey,
            to: tokenInfo?.BUSDTokenAddress,
            nonce: nonce,
            gas: gasLimit,
            gasPrice: gasPrice,
            value: '0x0',
            data: tokenContract?.methods
              ?.transfer(sendAmountDTO?.receiverAddress, amountInWei)
              ?.encodeABI(),
          };

          this._statService.methodCalled({
            chainID: chainID,
            methodName: 'eth_signTransaction',
            senderAddress: wallet?.walletAddress,
          });
          let data = await web3.eth.accounts.signTransaction(trx, privateKey);

          this._statService.methodCalled({
            chainID: chainID,
            methodName: 'eth_sendSignedTransaction',
            senderAddress: wallet?.walletAddress,
          });
          const res = await web3.eth.sendSignedTransaction(data.rawTransaction);

          const trxHash = res?.transactionHash;

          return {
            status: 'success',
            trxHash: trxHash,
          };
        }
      } else {
        throw new BadRequestException('Invalid encryption key');
      }
    } catch (err) {
      console.log(err);
      throw new BadRequestException(err?.message);
    }
  }

  async sendAmountWith2FA(user, sendAmountDTO: SendAmountDTOV2) {
    try {
      const currentUser = await this._userModel.findOne({ _id: user.id });

      if (!currentUser.isKeyVerified) {
        throw new Error('Encryption Key Not verified');
      }

      if (!currentUser.isTwoFactorEnabled) {
        return this.sendAmountV2(sendAmountDTO, user);
      }

      const userEmail = user.email;
      const otp = otpGenerator.generate(6, {
        upperCaseAlphabets: false,
        lowerCaseAlphabets: false,
        specialChars: false,
      });

      let expiryTimeInSeconds = 2 * 60;

      let expiryTime = new Date(Date.now()).getTime() + 2 * 60 * 1000;

      console.log(expiryTime);

      const otpObject = {
        otp,
        expiryTime,
        userEmail,
        userID: user.id,
        walletID: sendAmountDTO.walletID,
        receiverAddress: sendAmountDTO.receiverAddress,
        amount: sendAmountDTO.amount,
        chainID: sendAmountDTO.chainID,
        gasLimit: sendAmountDTO.gasLimit,
        gasPrice: sendAmountDTO.gasPrice,
      };

      const expiredOtp = await this._otpModel.find({
        userEmail: userEmail,
        expiryTime: { $lt: new Date(Date.now()).getTime() },
      });

      let currentTime = new Date(Date.now()).getTime();

      if (expiredOtp[0]) {
        if (currentTime > expiredOtp[0].expiryTime) {
          await this._otpModel.findByIdAndUpdate(expiredOtp[0]._id, {
            isUsed: true,
          });
        }
      }

      const otpAlreadyPresent = await this._otpModel.find({
        userEmail: userEmail,
        isUsed: false,
      });

      if (otpAlreadyPresent.length > 0) {
        await this._otpModel.findByIdAndUpdate(otpAlreadyPresent[0]._id, {
          isUsed: true,
        });
      }

      await this._otpModel.create(otpObject);

      const username = 'api';
      const password = '100773e31ff91b811e416cba842b3040-1b3a03f6-c4ca4557';

      const url = 'https://api.eu.mailgun.net/v3/stableonegroup.com/messages';

      const res = await axios({
        method: 'post',
        url,
        auth: {
          username,
          password,
        },
        params: {
          from: 'Stable Fund <no-reply@stableonegroup.com>',
          to: userEmail,
          subject: `Withdrawal Requested - ${new Date().toUTCString()}`,
          html: getEmailHTML(
            currentUser?.firstname,
            currentUser?.lastname,
            `${sendAmountDTO?.amount} ${
              chainIdToRpc[sendAmountDTO?.chainID]?.name
            }`,
            sendAmountDTO?.receiverAddress,
            otp,
          ),
        },
      });

      return { message: 'OTP sent successfully!', expiryTimeInSeconds };
    } catch (err) {
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }

  async verifyOtp(verifyOtpDto, user) {
    try {
      const otp = await this._otpModel.findOne({
        userID: user.id,
        otp: verifyOtpDto.otp,
        isUsed: false,
      });

      if (!otp) {
        throw 'Wrong OTP typed';
      }

      let currentTime = new Date(Date.now()).getTime();
      let expiryTime = otp.expiryTime;

      if (currentTime > expiryTime) {
        await this._otpModel.findByIdAndUpdate(otp._id, { isUsed: true });
        throw 'Otp expired';
      }

      const sendAmountDto: SendAmountDTOV2 = {
        encryptionKey: verifyOtpDto.encryptionKey,
        walletID: otp.walletID,
        receiverAddress: otp.receiverAddress,
        amount: otp.amount,
        chainID: otp.chainID,
        gasLimit: otp.gasLimit,
        gasPrice: otp.gasPrice,
      };

      return this.sendAmountV2(sendAmountDto, user);
    } catch (err) {
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }

  async getSendAmountGasFee(sendAmountDTO: SendAmountDTOV2, user) {
    try {
      const chainIds = Object.keys(chainIdToRpc);

      let chainID = sendAmountDTO?.chainID;

      if (!chainIds.includes(chainID.toString())) {
        throw new BadRequestException(`Chain ID ${chainID} is not supported`);
      }

      const chainId = chainIds.find((item) => item == chainID);

      const chainIDObj = chainIdToRpc[sendAmountDTO?.chainID];

      chainID = chainIDObj?.chainID;

      const web3 = this.web3Instances[sendAmountDTO?.chainID];

      const amountInWei = web3.utils.toWei(sendAmountDTO?.amount, 'ether');

      const wallet = await this._walletModel.findOne({
        _id: sendAmountDTO?.walletID,
      });

      const amount = parseFloat(amountInWei);
      const publicKey = wallet
        ? wallet?.walletAddress
        : sendAmountDTO?.walletID;

      if (!chainIDObj?.isToken) {
        this._statService.methodCalled({
          chainID: chainID,
          methodName: 'eth_getBalance',
          senderAddress: wallet?.walletAddress,
        });
        const balanceInWei = await web3.eth.getBalance(publicKey);

        if (parseFloat(balanceInWei) < amount) {
          throw new BadRequestException(`Insufficient balance`);
        }

        this._statService.methodCalled({
          chainID: chainID,
          methodName: 'eth_estimateGas',
          senderAddress: wallet?.walletAddress,
        });
        const gasLimit = await web3.eth.estimateGas({
          from: publicKey,
          value: amountInWei,
        });

        this._statService.methodCalled({
          chainID: chainID,
          methodName: 'eth_gasPrice',
          senderAddress: wallet?.walletAddress,
        });
        const gasPrice = await web3.eth.getGasPrice();

        const gasPriceInEth = web3.utils.fromWei(gasPrice, 'ether');

        const gas = parseFloat(gasPriceInEth) * gasLimit;

        this._statService.methodCalled({
          chainID: chainID,
          methodName: 'eth_getBlock',
          senderAddress: wallet?.walletAddress,
        });
        const baseFee = await web3.eth
          .getBlock('pending')
          .then((item) => item?.baseFeePerGas);

        const gasPriceLow = gas + 0.05 * gas;

        const gasPriceMedium = gas + 0.12 * gas;

        const gasPriceHigh = gas + 0.2 * gas;

        this._statService.methodCalled({
          chainID: chainID,
          methodName: 'eth_getBalance',
          senderAddress: wallet?.walletAddress,
        });
        const balance = await web3.eth.getBalance(publicKey);
        const balanceInEth = parseFloat(web3.utils.fromWei(balance, 'ether'));

        return {
          low: {
            gasLimit,
            gasPrice: gasPriceLow,
            gas: gasPriceLow,
            baseFee,
            total: parseFloat(sendAmountDTO?.amount) + gasPriceLow,
            balance: balanceInEth,
            isPossible:
              parseFloat(sendAmountDTO?.amount) + gasPriceLow <= balanceInEth,
          },
          medium: {
            gasLimit,
            gasPrice: gasPriceMedium,
            gas: gasPriceMedium,
            baseFee,
            total: parseFloat(sendAmountDTO?.amount) + gasPriceMedium,
            balance: balanceInEth,
            isPossible:
              parseFloat(sendAmountDTO?.amount) + gasPriceMedium <=
              balanceInEth,
          },
          high: {
            gasLimit,
            gasPrice: gasPriceHigh,
            gas: gasPriceHigh,
            baseFee,
            total: parseFloat(sendAmountDTO?.amount) + gasPriceHigh,
            balance: balanceInEth,
            isPossible:
              parseFloat(sendAmountDTO?.amount) + gasPriceHigh <= balanceInEth,
          },
        };
      } else {
        const tokenInfo = TokenInfo[sendAmountDTO?.chainID];

        this._statService.methodCalled({
          chainID: chainID,
          methodName: 'eth_getBalance',
          senderAddress: wallet?.walletAddress,
        });
        const nativeCoinBalanceInWei = await web3.eth.getBalance(publicKey);
        const nativeCoinBalanceInEth = parseFloat(
          web3.utils.fromWei(nativeCoinBalanceInWei, 'ether'),
        );

        const tokenContract = new web3.eth.Contract(
          ABI[sendAmountDTO?.chainID].abi,
          tokenInfo?.BUSDTokenAddress,
        );

        this._statService.methodCalled({
          chainID: chainID,
          methodName: 'eth_call',
          senderAddress: wallet?.walletAddress,
        });
        const balanceInWei = await tokenContract?.methods
          ?.balanceOf(publicKey)
          .call();

        const balanceInEth = parseFloat(
          web3.utils.fromWei(balanceInWei, 'ether'),
        );

        if (parseFloat(sendAmountDTO?.amount) > balanceInEth) {
          throw new BadRequestException('Insufficient balance');
        }

        const amountInWei = web3.utils.toWei(sendAmountDTO?.amount, 'ether');

        this._statService.methodCalled({
          chainID: chainID,
          methodName: 'eth_estimateGas',
          senderAddress: wallet?.walletAddress,
        });
        const gasLimit = await tokenContract?.methods
          ?.transfer(sendAmountDTO?.receiverAddress, amountInWei)
          .estimateGas({
            from: publicKey,
          });

        this._statService.methodCalled({
          chainID: chainID,
          methodName: 'eth_gasPrice',
          senderAddress: publicKey,
        });
        const gasPrice = await web3.eth.getGasPrice();

        const gasPriceInEth = web3.utils.fromWei(gasPrice, 'ether');

        const gas = parseFloat(gasPriceInEth) * gasLimit;

        this._statService.methodCalled({
          chainID: chainID,
          methodName: 'eth_getBlock',
          senderAddress: wallet?.walletAddress,
        });
        const baseFee = await web3.eth
          .getBlock('pending')
          .then((item) => item?.baseFeePerGas);

        const gasPriceLow = gas + 0.05 * gas;

        const gasPriceMedium = gas + 0.12 * gas;

        const gasPriceHigh = gas + 0.2 * gas;

        return {
          low: {
            gasLimit,
            gasPrice: gasPriceLow,
            gas: gasPriceLow,
            baseFee,
            total: gasPriceLow,
            balance: nativeCoinBalanceInEth,
            isPossible: gasPriceLow <= nativeCoinBalanceInEth,
          },
          medium: {
            gasLimit,
            gasPrice: gasPriceMedium,
            gas: gasPriceMedium,
            baseFee,
            total: gasPriceMedium,
            balance: nativeCoinBalanceInEth,
            isPossible: gasPriceMedium <= nativeCoinBalanceInEth,
          },
          high: {
            gasLimit,
            gasPrice: gasPriceHigh,
            gas: gasPriceHigh,
            baseFee,
            total: gasPriceHigh,
            balance: nativeCoinBalanceInEth,
            isPossible: gasPriceHigh <= nativeCoinBalanceInEth,
          },
        };
      }
    } catch (err) {
      console.log(err);
      throw new BadRequestException(err?.message);
    }
  }

  async investOnStableFund(investAmountDTO: InvestAmountDTO, user) {
    try {
      const chainIds = Object.keys(chainIdToRpc);

      let chainID = investAmountDTO?.chainID;

      if (!chainIds.includes(chainID.toString())) {
        throw new BadRequestException(`Chain ID ${chainID} is not supported`);
      }

      const chainId = chainIds.find((item) => item == chainID);

      const chainIDObj = chainIdToRpc[investAmountDTO?.chainID];

      chainID = chainIDObj?.chainID;

      const maticChainID = '137';

      const web3 =
        chainID == maticChainID
          ? new Web3(chainIDObj?.rpc2)
          : this.web3Instances[investAmountDTO?.chainID];

      const userData = await this._userModel.findOne({ _id: user.id });

      if (
        await bcrypt.compare(
          investAmountDTO.encryptionKey,
          userData.encryptionKey,
        )
      ) {
        const encryptionKeyDto = {
          encryptionKey: investAmountDTO?.encryptionKey,
        };

        const wallet = await this.getWalletDetail(
          investAmountDTO?.walletID,
          encryptionKeyDto,
          user,
        );

        const amount = investAmountDTO?.amountInWei;
        const publicKey = wallet?.walletAddress;
        const privateKey = wallet?.privateKey;

        const amountInEth = parseFloat(
          await web3.utils.fromWei(investAmountDTO?.amountInWei, 'ether'),
        );

        if (!chainIDObj?.isToken) {
          const tokenInfo = TokenInfo[investAmountDTO?.chainID];

          if (Date.now() < tokenInfo?.startDate) {
            throw new BadRequestException(
              `Staking will be lived on ${new Date(
                tokenInfo?.startDate,
              )?.toUTCString()}`,
            );
          }

          this._statService.methodCalled({
            chainID: chainID,
            methodName: 'eth_getBalance',
            senderAddress: wallet?.walletAddress,
          });
          const currentBalance = await web3.eth.getBalance(
            wallet?.walletAddress,
          );

          const currentBalanceInEth = parseFloat(
            await web3.utils.fromWei(currentBalance, 'ether'),
          );

          if (currentBalanceInEth <= amountInEth) {
            throw new BadRequestException('Insufficient balance');
          }

          // Invest transaction here
          const stableFundContract = new web3.eth.Contract(
            StableFundABI,
            stableFundChainIDToAddress[chainID]?.contract,
          );

          this._statService.methodCalled({
            chainID: chainID,
            methodName: 'eth_getTransactionCount',
            senderAddress: wallet?.walletAddress,
          });
          const nonce = await web3.eth.getTransactionCount(publicKey, 'latest');

          let gasLimit, gasPrice;

          if (investAmountDTO?.gasLimit && investAmountDTO?.gasPrice) {
            gasLimit = investAmountDTO?.gasLimit;
            gasPrice = Math.floor(
              parseFloat(
                web3.utils.toWei(
                  investAmountDTO?.gasPrice?.toFixed(18)?.toString(),
                  'ether',
                ),
              ) / gasLimit,
            ).toString();
          } else {
            this._statService.methodCalled({
              chainID: chainID,
              methodName: 'eth_estimateGas',
              senderAddress: wallet?.walletAddress,
            });
            gasLimit =
              (await stableFundContract.methods
                .deposit()
                .estimateGas({ from: publicKey, value: amount })) * 3;

            this._statService.methodCalled({
              chainID: chainID,
              methodName: 'eth_gasPrice',
              senderAddress: wallet?.walletAddress,
            });
            gasPrice = await web3.eth.getGasPrice();
          }

          const trx = {
            from: publicKey,
            to: stableFundChainIDToAddress[chainID]?.contract,
            nonce: nonce,
            gas: gasLimit,
            gasPrice: gasPrice,
            value: amount,
            data: stableFundContract.methods.deposit().encodeABI(),
          };

          this._statService.methodCalled({
            chainID: chainID,
            methodName: 'eth_signTransaction',
            senderAddress: wallet?.walletAddress,
          });
          let data = await web3.eth.accounts.signTransaction(trx, privateKey);

          this._statService.methodCalled({
            chainID: chainID,
            methodName: 'eth_sendSignedTransaction',
            senderAddress: wallet?.walletAddress,
          });
          const res = await web3.eth.sendSignedTransaction(data.rawTransaction);

          const trxHash = res?.transactionHash;

          const walletAddress = wallet?.walletAddress;
          const regex = new RegExp(`^${walletAddress}$`, 'i');

          const history = await this._historyModel.findOne({
            walletAddress: regex,
          });

          if (history) {
            await this._historyModel.updateMany(
              {
                walletAddress: regex,
              },
              { updated: true },
            );
          }
          await this.getStakeHistoryV2(
            walletAddress,
            investAmountDTO?.chainID,
            true,
          );
          return {
            status: 'success',
            trxHash: trxHash,
          };
        } else {
          const tokenInfo = TokenInfo[investAmountDTO?.chainID];

          const tokenContract = new web3.eth.Contract(
            ABI[investAmountDTO?.chainID].abi,
            tokenInfo?.BUSDTokenAddress,
          );

          const stableFundContract = new web3.eth.Contract(
            tokenInfo?.abi,
            tokenInfo?.contractAddress,
          );

          if (Date.now() < tokenInfo?.startDate) {
            throw new BadRequestException(
              `Staking will be lived on ${new Date(
                tokenInfo?.startDate,
              )?.toUTCString()}`,
            );
          }

          this._statService.methodCalled({
            chainID: chainID,
            methodName: 'eth_signTransaction',
            senderAddress: wallet?.walletAddress,
          });
          const balanceInWei = await tokenContract?.methods
            ?.balanceOf(wallet?.walletAddress)
            .call();

          const balanceInEth = parseFloat(
            web3.utils.fromWei(balanceInWei, 'ether'),
          );

          if (balanceInEth < amountInEth) {
            throw new BadRequestException('Insufficient balance');
          }

          this._statService.methodCalled({
            chainID: chainID,
            methodName: 'eth_getTransactionCount',
            senderAddress: wallet?.walletAddress,
          });
          const nonce = await web3.eth.getTransactionCount(publicKey, 'latest');

          let gasLimit, gasPrice;
          if (investAmountDTO?.gasLimit && investAmountDTO?.gasPrice) {
            gasLimit = investAmountDTO?.gasLimit;
            gasPrice = Math.floor(
              parseFloat(
                web3.utils.toWei(
                  investAmountDTO?.gasPrice?.toFixed(18)?.toString(),
                  'ether',
                ),
              ) / gasLimit,
            ).toString();
          } else {
            this._statService.methodCalled({
              chainID: chainID,
              methodName: 'eth_estimateGas',
              senderAddress: wallet?.walletAddress,
            });
            gasLimit =
              (await stableFundContract.methods
                .deposit(amount)
                .estimateGas({ from: publicKey })) * 3;

            this._statService.methodCalled({
              chainID: chainID,
              methodName: 'eth_gasPrice',
              senderAddress: wallet?.walletAddress,
            });
            gasPrice = await web3.eth.getGasPrice();
          }

          const trx = {
            from: publicKey,
            to: tokenInfo?.contractAddress,
            nonce: nonce,
            gas: gasLimit,
            gasPrice: gasPrice,
            data: stableFundContract.methods.deposit(amount).encodeABI(),
          };

          this._statService.methodCalled({
            chainID: chainID,
            methodName: 'eth_signTransaction',
            senderAddress: wallet?.walletAddress,
          });
          let data = await web3.eth.accounts.signTransaction(trx, privateKey);

          this._statService.methodCalled({
            chainID: chainID,
            methodName: 'eth_sendSignedTransaction',
            senderAddress: wallet?.walletAddress,
          });
          const res = await web3.eth.sendSignedTransaction(data.rawTransaction);

          const trxHash = res?.transactionHash;

          const walletAddress = wallet?.walletAddress;
          const regex = new RegExp(`^${walletAddress}$`, 'i');

          const history = await this._historyModel.findOne({
            walletAddress: regex,
          });

          if (history) {
            await this._historyModel.updateMany(
              {
                walletAddress: regex,
              },
              { updated: true },
            );
          }
          await this.getStakeHistoryV2(
            walletAddress,
            investAmountDTO?.chainID,
            true,
          );
          return {
            status: 'success',
            trxHash: trxHash,
          };
        }
      } else {
        throw new BadRequestException('Invalid encryption key');
      }
    } catch (err) {
      console.log(err);
      throw new BadRequestException(err?.message);
    }
  }

  async getInvestOnStableFundGasFee(investAmountDTO: InvestAmountDTOV2, user) {
    try {
      const chainIds = Object.keys(chainIdToRpc);

      let chainID = investAmountDTO?.chainID;

      if (!chainIds.includes(chainID.toString())) {
        throw new BadRequestException(`Chain ID ${chainID} is not supported`);
      }

      const chainId = chainIds.find((item) => item == chainID);

      const chainIDObj = chainIdToRpc[investAmountDTO?.chainID];

      chainID = chainIDObj?.chainID;

      const web3 = this.web3Instances[investAmountDTO?.chainID];

      const wallet = await this._walletModel.findOne({
        _id: investAmountDTO?.walletID,
      });

      let amountInWei = await web3.utils.toWei(
        investAmountDTO?.amount,
        'ether',
      );

      const amountInEth = parseFloat(web3.utils.fromWei(amountInWei, 'ether'));
      const publicKey = wallet
        ? wallet?.walletAddress
        : investAmountDTO?.walletID;
      if (!chainIDObj?.isToken) {
        const tokenInfo = TokenInfo[investAmountDTO?.chainID];

        if (Date.now() < tokenInfo?.startDate) {
          throw new BadRequestException(
            `Staking will be lived on ${new Date(
              tokenInfo?.startDate,
            )?.toUTCString()}`,
          );
        }

        // Invest transaction here
        const stableFundContract = new web3.eth.Contract(
          StableFundABI,
          stableFundChainIDToAddress[chainID]?.contract,
        );

        const amount = parseFloat(amountInWei);
        this._statService.methodCalled({
          chainID: chainID,
          methodName: 'eth_getBalance',
          senderAddress: wallet?.walletAddress,
        });
        const balanceInWei = await web3.eth.getBalance(publicKey);

        if (parseFloat(balanceInWei) < amount) {
          throw new BadRequestException(`Insufficient balance`);
        }

        this._statService.methodCalled({
          chainID: chainID,
          methodName: 'eth_estimateGas',
          senderAddress: wallet?.walletAddress,
        });
        const gasLimit = await stableFundContract.methods
          .deposit()
          .estimateGas({ from: publicKey, value: amountInWei });

        this._statService.methodCalled({
          chainID: chainID,
          methodName: 'eth_gasPrice',
          senderAddress: wallet?.walletAddress,
        });
        const gasPrice = await web3.eth.getGasPrice();

        const gasPriceInEth = web3.utils.fromWei(gasPrice, 'ether');

        const gas = parseFloat(gasPriceInEth) * gasLimit;

        this._statService.methodCalled({
          chainID: chainID,
          methodName: 'eth_getBlock',
          senderAddress: wallet?.walletAddress,
        });
        const baseFee = await web3.eth
          .getBlock('pending')
          .then((item) => item?.baseFeePerGas);

        const gasPriceLow = gas + 0.05 * gas;

        const gasPriceMedium = gas + 0.12 * gas;

        const gasPriceHigh = gas + 0.2 * gas;

        this._statService.methodCalled({
          chainID: chainID,
          methodName: 'eth_getBalance',
          senderAddress: wallet?.walletAddress,
        });
        const balance = await web3.eth.getBalance(publicKey);
        const balanceInEth = parseFloat(web3.utils.fromWei(balance, 'ether'));

        return {
          low: {
            gasLimit,
            gasPrice: gasPriceLow,
            gas: gasPriceLow,
            baseFee,
            total: parseFloat(investAmountDTO?.amount) + gasPriceLow,
            balance: balanceInEth,
            isPossible:
              parseFloat(investAmountDTO?.amount) + gasPriceLow <= balanceInEth,
          },
          medium: {
            gasLimit,
            gasPrice: gasPriceMedium,
            gas: gasPriceMedium,
            baseFee,
            total: parseFloat(investAmountDTO?.amount) + gasPriceMedium,
            balance: balanceInEth,
            isPossible:
              parseFloat(investAmountDTO?.amount) + gasPriceMedium <=
              balanceInEth,
          },
          high: {
            gasLimit,
            gasPrice: gasPriceHigh,
            gas: gasPriceHigh,
            baseFee,
            total: parseFloat(investAmountDTO?.amount) + gasPriceHigh,
            balance: balanceInEth,
            isPossible:
              parseFloat(investAmountDTO?.amount) + gasPriceHigh <=
              balanceInEth,
          },
        };
      } else {
        const tokenInfo = TokenInfo[investAmountDTO?.chainID];

        const tokenContract = new web3.eth.Contract(
          ABI[investAmountDTO?.chainID].abi,
          tokenInfo?.BUSDTokenAddress,
        );

        const stableFundContract = new web3.eth.Contract(
          tokenInfo?.abi,
          tokenInfo?.contractAddress,
        );

        if (Date.now() < tokenInfo?.startDate) {
          throw new BadRequestException(
            `Staking will be lived on ${new Date(
              tokenInfo?.startDate,
            )?.toUTCString()}`,
          );
        }

        this._statService.methodCalled({
          chainID: chainID,
          methodName: 'eth_call',
          senderAddress: wallet?.walletAddress,
        });
        const balanceInWei = await tokenContract?.methods
          ?.balanceOf(publicKey)
          .call();

        const balanceInEth = parseFloat(
          web3.utils.fromWei(balanceInWei, 'ether'),
        );

        if (balanceInEth < amountInEth) {
          throw new BadRequestException('Insufficient balance');
        }

        this._statService.methodCalled({
          chainID: chainID,
          methodName: 'eth_estimateGas',
          senderAddress: wallet?.walletAddress,
        });
        const gasLimit = await stableFundContract.methods
          .deposit(amountInWei)
          .estimateGas({ from: publicKey });

        this._statService.methodCalled({
          chainID: chainID,
          methodName: 'eth_gasPrice',
          senderAddress: wallet?.walletAddress,
        });
        const gasPrice = await web3.eth.getGasPrice();

        const gasPriceInEth = web3.utils.fromWei(gasPrice, 'ether');

        const gas = parseFloat(gasPriceInEth) * gasLimit;

        this._statService.methodCalled({
          chainID: chainID,
          methodName: 'eth_getBlock',
          senderAddress: wallet?.walletAddress,
        });
        const baseFee = await web3.eth
          .getBlock('pending')
          .then((item) => item?.baseFeePerGas);

        const gasPriceLow = gas + 0.05 * gas;

        const gasPriceMedium = gas + 0.12 * gas;

        const gasPriceHigh = gas + 0.2 * gas;

        this._statService.methodCalled({
          chainID: chainID,
          methodName: 'eth_getBalance',
          senderAddress: wallet?.walletAddress,
        });
        const nativeChainBalance = await web3.eth.getBalance(publicKey);
        const nativeChainBalanceInEth = parseFloat(
          web3.utils.fromWei(nativeChainBalance, 'ether'),
        );

        return {
          low: {
            gasLimit,
            gasPrice: gasPriceLow,
            gas: gasPriceLow,
            baseFee,
            total: gasPriceLow,
            balance: nativeChainBalanceInEth,
            isPossible: gasPriceLow <= nativeChainBalanceInEth,
          },
          medium: {
            gasLimit,
            gasPrice: gasPriceMedium,
            gas: gasPriceMedium,
            baseFee,
            total: gasPriceMedium,
            balance: nativeChainBalanceInEth,
            isPossible: gasPriceMedium <= nativeChainBalanceInEth,
          },
          high: {
            gasLimit,
            gasPrice: gasPriceHigh,
            gas: gasPriceHigh,
            baseFee,
            total: gasPriceHigh,
            balance: nativeChainBalanceInEth,
            isPossible: gasPriceHigh <= nativeChainBalanceInEth,
          },
        };
      }
    } catch (err) {
      console.log(err);
      throw new BadRequestException(err?.message);
    }
  }

  async getApproveGasFee(investAmountDTO: InvestAmountDTOV2, user) {
    try {
      const chainIds = Object.keys(chainIdToRpc);

      let chainID = investAmountDTO?.chainID;

      if (
        !chainIds.includes(chainID) ||
        !chainIdToRpc[chainID]?.isStakingAvailable
      ) {
        throw new BadRequestException(`Chain ID ${chainID} is not supported`);
      }

      const chainId = chainIds.find((item) => item == chainID);

      const chainIDObj = chainIdToRpc[chainId];

      chainID = chainIDObj?.chainID;

      const web3 = this.web3Instances[investAmountDTO?.chainID];

      const wallet = await this._walletModel.findOne({
        _id: investAmountDTO?.walletID,
      });

      let amountInWei = await web3.utils.toWei(
        investAmountDTO?.amount,
        'ether',
      );

      const amountInEth = parseFloat(web3.utils.fromWei(amountInWei, 'ether'));
      const publicKey = wallet
        ? wallet?.walletAddress
        : investAmountDTO?.walletID;
      if (chainIDObj?.isToken) {
        const tokenInfo = TokenInfo[investAmountDTO?.chainID];

        const tokenContract = new web3.eth.Contract(
          ABI[investAmountDTO?.chainID].abi,
          tokenInfo?.BUSDTokenAddress,
        );

        const stableFundContract = new web3.eth.Contract(
          tokenInfo?.abi,
          tokenInfo?.contractAddress,
        );

        if (Date.now() < tokenInfo?.startDate) {
          throw new BadRequestException(
            `Staking will be lived on ${new Date(
              tokenInfo?.startDate,
            )?.toUTCString()}`,
          );
        }

        this._statService.methodCalled({
          chainID: chainID,
          methodName: 'eth_call',
          senderAddress: wallet?.walletAddress,
        });
        const balanceInWei = await tokenContract?.methods
          ?.balanceOf(publicKey)
          .call();

        const balanceInEth = parseFloat(
          web3.utils.fromWei(balanceInWei, 'ether'),
        );

        if (balanceInEth < amountInEth) {
          throw new BadRequestException('Insufficient balance');
        }

        this._statService.methodCalled({
          chainID: chainID,
          methodName: 'eth_estimateGas',
          senderAddress: wallet?.walletAddress,
        });
        const gasLimit = await tokenContract.methods
          .approve(tokenInfo?.contractAddress, amountInWei)
          .estimateGas({ from: publicKey });

        this._statService.methodCalled({
          chainID: chainID,
          methodName: 'eth_gasPrice',
          senderAddress: wallet?.walletAddress,
        });
        const gasPrice = await web3.eth.getGasPrice();

        const gasPriceInEth = web3.utils.fromWei(gasPrice, 'ether');

        const gas = parseFloat(gasPriceInEth) * gasLimit * 3;

        this._statService.methodCalled({
          chainID: chainID,
          methodName: 'eth_getBlock',
          senderAddress: wallet?.walletAddress,
        });
        const baseFee = await web3.eth
          .getBlock('pending')
          .then((item) => item?.baseFeePerGas);

        const gasPriceLow = gas + 0.05 * gas;

        const gasPriceMedium = gas + 0.12 * gas;

        const gasPriceHigh = gas + 0.2 * gas;
        this._statService.methodCalled({
          chainID: chainID,
          methodName: 'eth_getBalance',
          senderAddress: wallet?.walletAddress,
        });
        const nativeChainBalance = await web3.eth.getBalance(publicKey);
        const nativeChainBalanceInEth = parseFloat(
          web3.utils.fromWei(nativeChainBalance, 'ether'),
        );
        return {
          low: {
            gasLimit,
            gasPrice: gasPriceLow,
            gas: gasPriceLow,
            baseFee,
            total: gasPriceLow,
            balance: nativeChainBalanceInEth,
            isPossible: gasPriceLow <= nativeChainBalanceInEth,
          },
          medium: {
            gasLimit,
            gasPrice: gasPriceMedium,
            gas: gasPriceMedium,
            baseFee,
            total: gasPriceMedium,
            balance: nativeChainBalanceInEth,
            isPossible: gasPriceMedium <= balanceInEth,
          },
          high: {
            gasLimit,
            gasPrice: gasPriceHigh,
            gas: gasPriceHigh,
            baseFee,
            total: gasPriceHigh,
            balance: nativeChainBalanceInEth,
            isPossible: gasPriceHigh <= nativeChainBalanceInEth,
          },
        };
      } else {
        throw new BadRequestException('Not a token to approve');
      }
    } catch (err) {
      console.log(err);
      throw new BadRequestException(err?.message);
    }
  }

  async approveAmount(investAmountDTO: InvestAmountDTOV2, user) {
    try {
      const chainIds = Object.keys(chainIdToRpc);

      let chainID = investAmountDTO?.chainID;

      if (
        !chainIds.includes(chainID) ||
        !chainIdToRpc[chainID]?.isStakingAvailable
      ) {
        throw new BadRequestException(`Chain ID ${chainID} is not supported`);
      }

      const chainId = chainIds.find((item) => item == chainID);

      const chainIDObj = chainIdToRpc[chainId];

      chainID = chainIDObj?.chainID;

      const maticChainID = '137';

      const web3 =
        chainID == maticChainID
          ? new Web3(chainIDObj?.rpc2)
          : this.web3Instances[investAmountDTO?.chainID];

      const amountInWei = web3.utils.toWei(investAmountDTO?.amount, 'ether');
      const userData = await this._userModel.findOne({ _id: user.id });

      if (
        await bcrypt.compare(
          investAmountDTO.encryptionKey,
          userData.encryptionKey,
        )
      ) {
        const encryptionKeyDto = {
          encryptionKey: investAmountDTO?.encryptionKey,
        };

        const wallet = await this.getWalletDetail(
          investAmountDTO?.walletID,
          encryptionKeyDto,
          user,
        );

        this._statService.methodCalled({
          chainID: chainID,
          methodName: 'eth_getBalance',
          senderAddress: wallet?.walletAddress,
        });
        const currentBalance = await web3.eth.getBalance(wallet?.walletAddress);

        const currentBalanceInEth = parseFloat(
          await web3.utils.fromWei(currentBalance, 'ether'),
        );

        const amountInEth = parseFloat(
          await web3.utils.fromWei(amountInWei, 'ether'),
        );

        if (chainIDObj?.isToken) {
          const tokenInfo = TokenInfo[investAmountDTO?.chainID];

          const tokenContract = new web3.eth.Contract(
            ABI[investAmountDTO?.chainID].abi,
            tokenInfo?.BUSDTokenAddress,
          );

          const stableFundContract = new web3.eth.Contract(
            tokenInfo?.abi,
            tokenInfo?.contractAddress,
          );

          if (Date.now() < tokenInfo?.startDate) {
            throw new BadRequestException(
              `Staking will be lived on ${new Date(
                tokenInfo?.startDate,
              )?.toUTCString()}`,
            );
          }

          this._statService.methodCalled({
            chainID: chainID,
            methodName: 'eth_call',
            senderAddress: wallet?.walletAddress,
          });
          const balanceInWei = await tokenContract?.methods
            ?.balanceOf(wallet?.walletAddress)
            .call();

          const balanceInEth = parseFloat(
            web3.utils.fromWei(balanceInWei, 'ether'),
          );

          if (balanceInEth < amountInEth) {
            throw new BadRequestException('Insufficient balance');
          }

          const amount = amountInWei;
          const publicKey = wallet?.walletAddress;
          const privateKey = wallet?.privateKey;

          this._statService.methodCalled({
            chainID: chainID,
            methodName: 'eth_getTransactionCount',
            senderAddress: wallet?.walletAddress,
          });
          const nonce = await web3.eth.getTransactionCount(publicKey, 'latest');
          let gasLimit, gasPrice;
          if (investAmountDTO?.gasLimit && investAmountDTO?.gasPrice) {
            gasLimit = investAmountDTO?.gasLimit;
            gasPrice = Math.floor(
              parseFloat(
                web3.utils.toWei(
                  investAmountDTO?.gasPrice?.toFixed(18)?.toString(),
                  'ether',
                ),
              ) / gasLimit,
            ).toString();
          } else {
            this._statService.methodCalled({
              chainID: chainID,
              methodName: 'eth_estimateGas',
              senderAddress: wallet?.walletAddress,
            });
            gasLimit =
              (await tokenContract.methods
                .approve(tokenInfo?.contractAddress, amountInWei)
                .estimateGas({ from: publicKey })) * 3;

            this._statService.methodCalled({
              chainID: chainID,
              methodName: 'eth_gasPrice',
              senderAddress: wallet?.walletAddress,
            });
            gasPrice = await web3.eth.getGasPrice();
          }
          const trx = {
            from: publicKey,
            to: tokenInfo?.BUSDTokenAddress,
            nonce: nonce,
            gas: gasLimit,
            gasPrice: gasPrice,
            value: '0x0',
            data: tokenContract.methods
              .approve(tokenInfo?.contractAddress, amountInWei)
              .encodeABI(),
          };

          this._statService.methodCalled({
            chainID: chainID,
            methodName: 'eth_signTransaction',
            senderAddress: wallet?.walletAddress,
          });
          let data = await web3.eth.accounts.signTransaction(trx, privateKey);

          this._statService.methodCalled({
            chainID: chainID,
            methodName: 'eth_sendSignedTransaction',
            senderAddress: wallet?.walletAddress,
          });
          const res = await web3.eth.sendSignedTransaction(data.rawTransaction);
          const trxHash = res?.transactionHash;
          const walletAddress = wallet?.walletAddress;
          const regex = new RegExp(`^${walletAddress}$`, 'i');
          const history = await this._historyModel.findOne({
            walletAddress: regex,
          });
          if (history) {
            await this._historyModel.updateMany(
              {
                walletAddress: regex,
              },
              { updated: true },
            );
          }
          return {
            status: 'success',
            trxHash: trxHash,
          };
        } else {
          throw new BadRequestException('Not a token to approve');
        }
      } else {
        throw new BadRequestException('Invalid encryption key');
      }
    } catch (err) {
      console.log(err);
      throw new BadRequestException(err?.message);
    }
  }

  async isAmountApprovedForDeposit(checkApproval: CheckApprovalDTO) {
    try {
      const chainIds = Object.keys(chainIdToRpc);

      let chainID = checkApproval?.chainID;

      if (
        !chainIds.includes(chainID) ||
        !chainIdToRpc[chainID]?.isStakingAvailable
      ) {
        throw new BadRequestException(`Chain ID ${chainID} is not supported`);
      }

      const chainId = chainIds.find((item) => item == chainID);

      const chainIDObj = chainIdToRpc[chainId];

      chainID = chainIDObj?.chainID;

      const web3 = this.web3Instances[checkApproval?.chainID];

      const amountInWei = web3.utils.toWei(checkApproval?.amount, 'ether');

      if (chainIDObj?.isToken) {
        const tokenInfo = TokenInfo[checkApproval?.chainID];

        const tokenContract = new web3.eth.Contract(
          ABI[checkApproval?.chainID].abi,
          tokenInfo?.BUSDTokenAddress,
        );

        if (Date.now() < tokenInfo?.startDate) {
          throw new BadRequestException(
            `Staking will be lived on ${new Date(
              tokenInfo?.startDate,
            )?.toUTCString()}`,
          );
        }

        const contractAddress = tokenInfo?.contractAddress;

        this._statService.methodCalled({
          chainID: chainID,
          methodName: 'eth_call',
          senderAddress: checkApproval?.walletAddress,
        });
        const allowanceInWei = await tokenContract?.methods
          ?.allowance(checkApproval?.walletAddress, contractAddress)
          .call();

        const allowanceInEth = parseFloat(
          web3.utils.fromWei(allowanceInWei, 'ether'),
        );

        return {
          isSufficient: allowanceInEth >= parseFloat(checkApproval?.amount),
          allowance: allowanceInEth,
        };
      } else {
        throw new BadRequestException('Not a token to approve');
      }
    } catch (err) {
      console.log(err);
      throw new BadRequestException(err?.message);
    }
  }

  async getInvestOnStableFundGasFeeV2(
    investAmountDTO: InvestAmountDTOV2,
    user,
  ) {
    try {
      const chainIds = Object.keys(stableFundChainIDToAddress);

      const chainID = investAmountDTO?.chainID;

      if (!chainIds.includes(chainID.toString())) {
        throw new BadRequestException(`Chain ID ${chainID} is not supported`);
      }

      const web3 = this.web3Instances[investAmountDTO?.chainID];
      const alchemyWeb3 = this.alchemyWeb3[chainID];

      const userData = await this._userModel.findOne({ _id: user.id });

      // if (
      //   await bcrypt.compare(
      //     investAmountDTO.encryptionKey,
      //     userData.encryptionKey,
      //   )
      // ) {

      const wallet = await this._walletModel.findOne({
        _id: investAmountDTO?.walletID,
      });

      this._statService.methodCalled({
        chainID: chainID,
        methodName: 'eth_getBalance',
        senderAddress: wallet?.walletAddress,
      });
      const currentBalance = await web3.eth.getBalance(wallet?.walletAddress);

      const currentBalanceInEth = parseFloat(
        await web3.utils.fromWei(currentBalance, 'ether'),
      );

      let amountInWei = parseFloat(
        await web3.utils.toWei(investAmountDTO?.amount, 'ether'),
      );
      // if (currentBalanceInEth < parseFloat(investAmountDTO?.amount)) {
      //   // throw new BadRequestException('Insufficient balance');
      //   amountInEth = currentBalanceInEth/2;
      // }
      // Invest transaction here
      const stableFundContract = new alchemyWeb3.eth.Contract(
        StableFundABI,
        stableFundChainIDToAddress[chainID]?.contract,
      );

      const amount = amountInWei;
      const publicKey = wallet
        ? wallet?.walletAddress
        : investAmountDTO?.walletID;
      const privateKey = wallet?.privateKey;

      this._statService.methodCalled({
        chainID: chainID,
        methodName: 'eth_estimateGas',
        senderAddress: wallet?.walletAddress,
      });
      const gasLimit = await stableFundContract.methods
        .deposit()
        .estimateGas({ from: publicKey, value: amount });

      this._statService.methodCalled({
        chainID: chainID,
        methodName: 'eth_gasPrice',
        senderAddress: wallet?.walletAddress,
      });
      const gasPrice = await web3.eth.getGasPrice();

      const gasFeeHistory = await web3.eth.getFeeHistory(
        20,
        'latest',
        [25, 50, 75],
      );

      gasFeeHistory.baseFeePerGasInNumber = gasFeeHistory?.baseFeePerGas?.map(
        (item) => web3.utils.hexToNumber(item),
      );

      gasFeeHistory.rewardInNumber = gasFeeHistory?.reward?.map((item) =>
        item?.map((a) => web3.utils.hexToNumber(a)),
      );

      this._statService.methodCalled({
        chainID: chainID,
        methodName: 'eth_getBlock',
        senderAddress: wallet?.walletAddress,
      });

      const baseFee = await web3.eth
        .getBlock('pending')
        .then((item) => item?.baseFeePerGas);

      this._statService.methodCalled({
        chainID: chainID,
        methodName: 'eth_getMaxPriorityFeePerGas',
        senderAddress: wallet?.walletAddress,
      });
      const maxPriorityFeePerGas =
        await alchemyWeb3.eth.getMaxPriorityFeePerGas();

      let maxPriorityFeePerGasInEth = web3.utils.fromWei(
        web3.utils.hexToNumber(maxPriorityFeePerGas).toString(),
        'ether',
      );

      const gas = parseFloat(maxPriorityFeePerGasInEth) * gasLimit;

      const mediumGas =
        (parseFloat(maxPriorityFeePerGasInEth) + 20 * 0.000000001) * gasLimit;
      const highGas =
        (parseFloat(maxPriorityFeePerGasInEth) + 50 * 0.000000001) * gasLimit;

      return {
        low: { gasLimit, gasPrice: parseFloat(gasPrice), gas: gas, baseFee },
        medium: {
          gasLimit,
          gasPrice: parseFloat(gasPrice),
          gas: mediumGas,
          baseFee,
        },
        high: {
          gasLimit,
          gasPrice: parseFloat(gasPrice),
          gas: highGas,
          baseFee,
        },
      };

      // }
    } catch (err) {
      console.log(err);
      throw new BadRequestException(err?.message);
    }
  }

  async investOnStableFundV2(investAmountDTO: InvestAmountDTOV2, user) {
    try {
      const chainIds = Object.keys(chainIdToRpc);

      let chainID = investAmountDTO?.chainID;

      if (!chainIds.includes(chainID.toString())) {
        throw new BadRequestException(`Chain ID ${chainID} is not supported`);
      }

      const chainId = chainIds.find((item) => item == chainID);

      const chainIDObj = chainIdToRpc[investAmountDTO?.chainID];

      chainID = chainIDObj?.chainID;

      const web3 = this.web3Instances[investAmountDTO?.chainID];
      const alchemyWeb3 = this.alchemyWeb3[chainID];

      const amountInWei = web3.utils.toWei(investAmountDTO?.amount, 'ether');
      const userData = await this._userModel.findOne({ _id: user.id });

      if (
        await bcrypt.compare(
          investAmountDTO.encryptionKey,
          userData.encryptionKey,
        )
      ) {
        const encryptionKeyDto = {
          encryptionKey: investAmountDTO?.encryptionKey,
        };

        const wallet = await this.getWalletDetail(
          investAmountDTO?.walletID,
          encryptionKeyDto,
          user,
        );

        const amount = amountInWei;
        const publicKey = wallet?.walletAddress;
        const privateKey = wallet?.privateKey;

        const amountInEth = parseFloat(
          await web3.utils.fromWei(amountInWei, 'ether'),
        );

        if (!chainIDObj?.isToken) {
          const tokenInfo = TokenInfo[investAmountDTO?.chainID];

          if (Date.now() < tokenInfo?.startDate) {
            throw new BadRequestException(
              `Staking will be lived on ${new Date(
                tokenInfo?.startDate,
              )?.toUTCString()}`,
            );
          }

          this._statService.methodCalled({
            chainID: chainID,
            methodName: 'eth_getBalance',
            senderAddress: wallet?.walletAddress,
          });
          const currentBalance = await web3.eth.getBalance(
            wallet?.walletAddress,
          );

          const currentBalanceInEth = parseFloat(
            await web3.utils.fromWei(currentBalance, 'ether'),
          );

          if (currentBalanceInEth <= amountInEth) {
            throw new BadRequestException('Insufficient balance');
          }

          // Invest transaction here
          const stableFundContract = new alchemyWeb3.eth.Contract(
            StableFundABI,
            stableFundChainIDToAddress[chainID]?.contract,
          );

          this._statService.methodCalled({
            chainID: chainID,
            methodName: 'eth_getTransactionCount',
            senderAddress: wallet?.walletAddress,
          });
          const nonce = await alchemyWeb3.eth.getTransactionCount(
            publicKey,
            'latest',
          );

          let gasLimit, gasPrice;

          if (investAmountDTO?.gasLimit && investAmountDTO?.gasPrice) {
            gasLimit = investAmountDTO?.gasLimit;
            gasPrice = Math.floor(
              parseFloat(
                web3.utils.toWei(
                  investAmountDTO?.gasPrice?.toFixed(18)?.toString(),
                  'ether',
                ),
              ) / gasLimit,
            ).toString();
          } else {
            this._statService.methodCalled({
              chainID: chainID,
              methodName: 'eth_estimateGas',
              senderAddress: wallet?.walletAddress,
            });
            gasLimit =
              (await stableFundContract.methods
                .deposit()
                .estimateGas({ from: publicKey, value: amount })) * 3;

            this._statService.methodCalled({
              chainID: chainID,
              methodName: 'eth_gasPrice',
              senderAddress: wallet?.walletAddress,
            });
            gasPrice = await web3.eth.getGasPrice();
          }

          const trx = {
            from: publicKey,
            to: stableFundChainIDToAddress[chainID]?.contract,
            nonce: nonce,
            gas: gasLimit,
            gasPrice: gasPrice,
            value: amount,
            data: stableFundContract.methods.deposit().encodeABI(),
          };

          this._statService.methodCalled({
            chainID: chainID,
            methodName: 'eth_signTransaction',
            senderAddress: wallet?.walletAddress,
          });
          let data = await alchemyWeb3.eth.accounts.signTransaction(
            trx,
            privateKey,
          );

          this._statService.methodCalled({
            chainID: chainID,
            methodName: 'eth_sendSignedTransaction',
            senderAddress: wallet?.walletAddress,
          });
          const res = await alchemyWeb3.eth.sendSignedTransaction(
            data.rawTransaction,
          );

          const trxHash = res?.transactionHash;

          const walletAddress = wallet?.walletAddress;
          const regex = new RegExp(`^${walletAddress}$`, 'i');

          const history = await this._historyModel.findOne({
            walletAddress: regex,
          });

          if (history) {
            await this._historyModel.updateMany(
              {
                walletAddress: regex,
              },
              { updated: true },
            );
          }

          await this.getStakeHistoryV2(
            walletAddress,
            investAmountDTO?.chainID,
            true,
          );

          return {
            status: 'success',
            trxHash: trxHash,
          };
        } else {
          const tokenInfo = TokenInfo[investAmountDTO?.chainID];

          const tokenContract = new web3.eth.Contract(
            ABI[investAmountDTO?.chainID].abi,
            tokenInfo?.BUSDTokenAddress,
          );

          const stableFundContract = new web3.eth.Contract(
            tokenInfo?.abi,
            tokenInfo?.contractAddress,
          );

          if (Date.now() < tokenInfo?.startDate) {
            throw new BadRequestException(
              `Staking will be lived on ${new Date(
                tokenInfo?.startDate,
              )?.toUTCString()}`,
            );
          }

          this._statService.methodCalled({
            chainID: chainID,
            methodName: 'eth_call',
            senderAddress: wallet?.walletAddress,
          });
          const balanceInWei = await tokenContract?.methods
            ?.balanceOf(wallet?.walletAddress)
            .call();

          const balanceInEth = parseFloat(
            web3.utils.fromWei(balanceInWei, 'ether'),
          );

          if (balanceInEth < amountInEth) {
            throw new BadRequestException('Insufficient balance');
          }

          this._statService.methodCalled({
            chainID: chainID,
            methodName: 'eth_getTransactionCount',
            senderAddress: wallet?.walletAddress,
          });
          const nonce = await web3.eth.getTransactionCount(publicKey, 'latest');

          let gasLimit, gasPrice;
          if (investAmountDTO?.gasLimit && investAmountDTO?.gasPrice) {
            gasLimit = investAmountDTO?.gasLimit;
            gasPrice = Math.floor(
              parseFloat(
                web3.utils.toWei(
                  investAmountDTO?.gasPrice?.toFixed(18)?.toString(),
                  'ether',
                ),
              ) / gasLimit,
            ).toString();
          } else {
            this._statService.methodCalled({
              chainID: chainID,
              methodName: 'eth_estimateGas',
              senderAddress: wallet?.walletAddress,
            });
            gasLimit =
              (await stableFundContract.methods
                .deposit(amount)
                .estimateGas({ from: publicKey })) * 3;

            this._statService.methodCalled({
              chainID: chainID,
              methodName: 'eth_gasPrice',
              senderAddress: wallet?.walletAddress,
            });
            gasPrice = await web3.eth.getGasPrice();
          }

          const trx = {
            from: publicKey,
            to: tokenInfo?.contractAddress,
            nonce: nonce,
            gas: gasLimit,
            gasPrice: gasPrice,
            data: stableFundContract.methods.deposit(amount).encodeABI(),
          };

          this._statService.methodCalled({
            chainID: chainID,
            methodName: 'eth_signTransaction',
            senderAddress: wallet?.walletAddress,
          });
          let data = await web3.eth.accounts.signTransaction(trx, privateKey);

          this._statService.methodCalled({
            chainID: chainID,
            methodName: 'eth_sendSignedTransaction',
            senderAddress: wallet?.walletAddress,
          });
          const res = await web3.eth.sendSignedTransaction(data.rawTransaction);

          const trxHash = res?.transactionHash;

          const walletAddress = wallet?.walletAddress;
          const regex = new RegExp(`^${walletAddress}$`, 'i');

          const history = await this._historyModel.findOne({
            walletAddress: regex,
          });

          if (history) {
            await this._historyModel.updateMany(
              {
                walletAddress: regex,
              },
              { updated: true },
            );
          }

          await this.getStakeHistoryV2(
            walletAddress,
            investAmountDTO?.chainID,
            true,
          );

          return {
            status: 'success',
            trxHash: trxHash,
          };
        }
      } else {
        throw new BadRequestException('Invalid encryption key');
      }
    } catch (err) {
      console.log(err);
      throw new BadRequestException(err?.message);
    }
  }

  async withdrawRewardFromStableFund(claimRewardDTO: ClaimRewardDTO, user) {
    try {
      const chainIds = Object.keys(chainIdToRpc);

      let chainID = claimRewardDTO?.chainID;

      if (!chainIds.includes(chainID.toString())) {
        throw new BadRequestException(`Chain ID ${chainID} is not supported`);
      }

      const chainId = chainIds.find((item) => item == chainID);

      const chainIDObj = chainIdToRpc[claimRewardDTO?.chainID];

      chainID = chainIDObj?.chainID;

      const maticChainID = '137';

      const web3 =
        chainID == maticChainID
          ? new Web3(chainIDObj?.rpc2)
          : this.web3Instances[claimRewardDTO?.chainID];

      const userData = await this._userModel.findOne({ _id: user.id });

      if (
        await bcrypt.compare(
          claimRewardDTO.encryptionKey,
          userData.encryptionKey,
        )
      ) {
        const encryptionKeyDto = {
          encryptionKey: claimRewardDTO?.encryptionKey,
        };

        const wallet = await this.getWalletDetail(
          claimRewardDTO?.walletID,
          encryptionKeyDto,
          user,
        );

        const publicKey = wallet?.walletAddress;
        const privateKey = wallet?.privateKey;

        if (!chainIDObj?.isToken) {
          const tokenInfo = TokenInfo[claimRewardDTO?.chainID];

          if (Date.now() < tokenInfo?.startDate) {
            throw new BadRequestException(
              `Staking will be lived on ${new Date(
                tokenInfo?.startDate,
              )?.toUTCString()}`,
            );
          }
          //Invest transaction here
          const stableFundContract = new web3.eth.Contract(
            StableFundABI,
            stableFundChainIDToAddress[chainID]?.contract,
          );

          this._statService.methodCalled({
            chainID: chainID,
            methodName: 'eth_getTransactionCount',
            senderAddress: wallet?.walletAddress,
          });
          const nonce = await web3.eth.getTransactionCount(publicKey, 'latest');

          let gasLimit, gasPrice;

          if (claimRewardDTO?.gasLimit && claimRewardDTO?.gasPrice) {
            gasLimit = claimRewardDTO?.gasLimit;
            gasPrice = Math.floor(
              parseFloat(
                web3.utils.toWei(
                  claimRewardDTO?.gasPrice?.toFixed(18)?.toString(),
                  'ether',
                ),
              ) / gasLimit,
            ).toString();
          } else {
            this._statService.methodCalled({
              chainID: chainID,
              methodName: 'eth_call',
              senderAddress: wallet?.walletAddress,
            });
            gasLimit =
              (await stableFundContract.methods
                .claimAllReward()
                .estimateGas({ from: publicKey })) * 3;

            this._statService.methodCalled({
              chainID: chainID,
              methodName: 'eth_gasPrice',
              senderAddress: wallet?.walletAddress,
            });
            gasPrice = await web3.eth.getGasPrice();
          }

          const trx = {
            from: publicKey,
            to: stableFundChainIDToAddress[chainID]?.contract,
            nonce: nonce,
            gas: gasLimit,
            gasPrice: gasPrice,
            data: stableFundContract.methods.claimAllReward().encodeABI(),
          };

          this._statService.methodCalled({
            chainID: chainID,
            methodName: 'eth_signTransaction',
            senderAddress: wallet?.walletAddress,
          });
          let data = await web3.eth.accounts.signTransaction(trx, privateKey);

          this._statService.methodCalled({
            chainID: chainID,
            methodName: 'eth_sendSignedTransaction',
            senderAddress: wallet?.walletAddress,
          });
          const res = await web3.eth.sendSignedTransaction(data.rawTransaction);

          const trxHash = res?.transactionHash;

          const walletAddress = wallet?.walletAddress;
          const regex = new RegExp(`^${walletAddress}$`, 'i');

          const history = await this._historyModel.findOne({
            walletAddress: regex,
          });

          if (history) {
            await this._historyModel.updateMany(
              {
                walletAddress: regex,
              },
              { updated: true },
            );
          }

          await this.getStakeHistoryV2(
            walletAddress,
            claimRewardDTO?.chainID,
            true,
          );

          return {
            status: 'success',
            trxHash: trxHash,
          };
        } else {
          const tokenInfo = TokenInfo[claimRewardDTO?.chainID];

          const stableFundContract = new web3.eth.Contract(
            tokenInfo?.abi,
            tokenInfo?.contractAddress,
          );

          if (Date.now() < tokenInfo?.startDate) {
            throw new BadRequestException(
              `Staking will be lived on ${new Date(
                tokenInfo?.startDate,
              )?.toUTCString()}`,
            );
          }

          this._statService.methodCalled({
            chainID: chainID,
            methodName: 'eth_getTransactionCount',
            senderAddress: wallet?.walletAddress,
          });
          const nonce = await web3.eth.getTransactionCount(publicKey, 'latest');

          let gasLimit, gasPrice;

          if (claimRewardDTO?.gasLimit && claimRewardDTO?.gasPrice) {
            gasLimit = claimRewardDTO?.gasLimit;
            gasPrice = Math.floor(
              parseFloat(
                web3.utils.toWei(
                  claimRewardDTO?.gasPrice?.toFixed(18)?.toString(),
                  'ether',
                ),
              ) / gasLimit,
            ).toString();
          } else {
            this._statService.methodCalled({
              chainID: chainID,
              methodName: 'eth_estimateGas',
              senderAddress: wallet?.walletAddress,
            });
            gasLimit =
              (await stableFundContract.methods
                .claimAllReward()
                .estimateGas({ from: publicKey })) * 3;

            this._statService.methodCalled({
              chainID: chainID,
              methodName: 'eth_gasPrice',
              senderAddress: wallet?.walletAddress,
            });
            gasPrice = await web3.eth.getGasPrice();
          }

          const trx = {
            from: publicKey,
            to: stableFundChainIDToAddress[claimRewardDTO?.chainID]?.contract,
            nonce: nonce,
            gas: gasLimit,
            gasPrice: gasPrice,
            data: stableFundContract.methods.claimAllReward().encodeABI(),
          };

          this._statService.methodCalled({
            chainID: chainID,
            methodName: 'eth_signTransaction',
            senderAddress: wallet?.walletAddress,
          });
          let data = await web3.eth.accounts.signTransaction(trx, privateKey);

          this._statService.methodCalled({
            chainID: chainID,
            methodName: 'eth_sendSignedTransaction',
            senderAddress: wallet?.walletAddress,
          });
          const res = await web3.eth.sendSignedTransaction(data.rawTransaction);

          const trxHash = res?.transactionHash;

          const walletAddress = wallet?.walletAddress;
          const regex = new RegExp(`^${walletAddress}$`, 'i');

          const history = await this._historyModel.findOne({
            walletAddress: regex,
          });

          if (history) {
            await this._historyModel.updateMany(
              {
                walletAddress: regex,
              },
              { updated: true },
            );
          }

          await this.getStakeHistoryV2(
            walletAddress,
            claimRewardDTO?.chainID,
            true,
          );

          return {
            status: 'success',
            trxHash: trxHash,
          };
        }
      } else {
        throw new BadRequestException('Invalid encryption key');
      }
    } catch (err) {
      console.log(err);
      throw new BadRequestException(err?.message);
    }
  }

  async getWithdrawRewardGasFee(claimRewardDTO: ClaimRewardDTO, user) {
    try {
      const chainIds = Object.keys(chainIdToRpc);

      let chainID = claimRewardDTO?.chainID;

      if (!chainIds.includes(chainID.toString())) {
        throw new BadRequestException(`Chain ID ${chainID} is not supported`);
      }

      const chainId = chainIds.find((item) => item == chainID);

      const chainIDObj = chainIdToRpc[claimRewardDTO?.chainID];

      chainID = chainIDObj?.chainID;

      const maticChainID = '137';

      const web3 =
        chainID == maticChainID
          ? new Web3(chainIDObj?.rpc2)
          : this.web3Instances[claimRewardDTO?.chainID];

      const wallet = await this._walletModel.findOne({
        _id: claimRewardDTO?.walletID,
      });

      const publicKey = wallet
        ? wallet?.walletAddress
        : claimRewardDTO?.walletID;

      if (!chainIDObj?.isToken) {
        const tokenInfo = TokenInfo[claimRewardDTO?.chainID];

        if (Date.now() < tokenInfo?.startDate) {
          throw new BadRequestException(
            `Staking will be lived on ${new Date(
              tokenInfo?.startDate,
            )?.toUTCString()}`,
          );
        }

        // Invest transaction here
        const stableFundContract = new web3.eth.Contract(
          StableFundABI,
          stableFundChainIDToAddress[chainID]?.contract,
        );

        this._statService.methodCalled({
          chainID: chainID,
          methodName: 'eth_estimateGas',
          senderAddress: wallet?.walletAddress,
        });
        const gasLimit = await stableFundContract.methods
          .claimAllReward()
          .estimateGas({ from: publicKey });

        this._statService.methodCalled({
          chainID: chainID,
          methodName: 'eth_gasPrice',
          senderAddress: wallet?.walletAddress,
        });
        const gasPrice = await web3.eth.getGasPrice();

        const gasPriceInEth = web3.utils.fromWei(gasPrice, 'ether');

        const gas = parseFloat(gasPriceInEth) * gasLimit;

        this._statService.methodCalled({
          chainID: chainID,
          methodName: 'eth_getBlock',
          senderAddress: wallet?.walletAddress,
        });
        const baseFee = await web3.eth
          .getBlock('pending')
          .then((item) => item?.baseFeePerGas);

        const gasPriceLow = gas + 0.05 * gas;

        const gasPriceMedium = gas + 0.12 * gas;

        const gasPriceHigh = gas + 0.2 * gas;

        this._statService.methodCalled({
          chainID: chainID,
          methodName: 'eth_getBalance',
          senderAddress: wallet?.walletAddress,
        });
        const balance = await web3.eth.getBalance(publicKey);
        const balanceInEth = parseFloat(web3.utils.fromWei(balance, 'ether'));

        return {
          low: {
            gasLimit,
            gasPrice: gasPriceLow,
            gas: gasPriceLow,
            baseFee,
            total: gasPriceLow,
            balance: balanceInEth,
            isPossible: gasPriceLow <= balanceInEth,
          },
          medium: {
            gasLimit,
            gasPrice: gasPriceMedium,
            gas: gasPriceMedium,
            baseFee,
            total: gasPriceMedium,
            balance: balanceInEth,
            isPossible: gasPriceMedium <= balanceInEth,
          },
          high: {
            gasLimit,
            gasPrice: gasPriceHigh,
            gas: gasPriceHigh,
            baseFee,
            total: gasPriceHigh,
            balance: balanceInEth,
            isPossible: gasPriceHigh <= balanceInEth,
          },
        };
      } else {
        const tokenInfo = TokenInfo[claimRewardDTO?.chainID];

        const tokenContract = new web3.eth.Contract(
          ABI[claimRewardDTO?.chainID].abi,
          tokenInfo?.BUSDTokenAddress,
        );

        const stableFundContract = new web3.eth.Contract(
          tokenInfo?.abi,
          tokenInfo?.contractAddress,
        );

        if (Date.now() < tokenInfo?.startDate) {
          throw new BadRequestException(
            `Staking will be lived on ${new Date(
              tokenInfo?.startDate,
            )?.toUTCString()}`,
          );
        }

        this._statService.methodCalled({
          chainID: chainID,
          methodName: 'eth_estimateGas',
          senderAddress: wallet?.walletAddress,
        });
        const gasLimit = await stableFundContract.methods
          .claimAllReward()
          .estimateGas({ from: publicKey });

        this._statService.methodCalled({
          chainID: chainID,
          methodName: 'eth_gasPrice',
          senderAddress: wallet?.walletAddress,
        });
        const gasPrice = await web3.eth.getGasPrice();

        const gasPriceInEth = web3.utils.fromWei(gasPrice, 'ether');

        const gas = parseFloat(gasPriceInEth) * gasLimit;

        this._statService.methodCalled({
          chainID: chainID,
          methodName: 'eth_getBlock',
          senderAddress: wallet?.walletAddress,
        });
        const baseFee = await web3.eth
          .getBlock('pending')
          .then((item) => item?.baseFeePerGas);

        const gasPriceLow = gas + 0.05 * gas;

        const gasPriceMedium = gas + 0.12 * gas;

        const gasPriceHigh = gas + 0.2 * gas;

        this._statService.methodCalled({
          chainID: chainID,
          methodName: 'eth_getBalance',
          senderAddress: wallet?.walletAddress,
        });
        const balanceInWei = await web3.eth.getBalance(publicKey);

        const balanceInEth = parseFloat(
          web3.utils.fromWei(balanceInWei, 'ether'),
        );

        return {
          low: {
            gasLimit,
            gasPrice: gasPriceLow,
            gas: gasPriceLow,
            baseFee,
            total: gasPriceLow,
            balance: balanceInEth,
            isPossible: gasPriceLow <= balanceInEth,
          },
          medium: {
            gasLimit,
            gasPrice: gasPriceMedium,
            gas: gasPriceMedium,
            baseFee,
            total: gasPriceMedium,
            balance: balanceInEth,
            isPossible: gasPriceMedium <= balanceInEth,
          },
          high: {
            gasLimit,
            gasPrice: gasPriceHigh,
            gas: gasPriceHigh,
            baseFee,
            total: gasPriceHigh,
            balance: balanceInEth,
            isPossible: gasPriceHigh <= balanceInEth,
          },
        };
      }
    } catch (err) {
      console.log(err);
      throw new BadRequestException(err?.message);
    }
  }

  async withdrawCapitalFromStableFund(claimRewardDTO: ClaimRewardDTO, user) {
    try {
      const chainIds = Object.keys(chainIdToRpc);

      let chainID = claimRewardDTO?.chainID;

      if (!chainIds.includes(chainID.toString())) {
        throw new BadRequestException(`Chain ID ${chainID} is not supported`);
      }

      const chainId = chainIds.find((item) => item == chainID);

      const chainIDObj = chainIdToRpc[claimRewardDTO?.chainID];

      chainID = chainIDObj?.chainID;

      const maticChainID = '137';

      const web3 =
        chainID == maticChainID
          ? new Web3(chainIDObj?.rpc2)
          : this.web3Instances[claimRewardDTO?.chainID];

      const userData = await this._userModel.findOne({ _id: user.id });

      if (
        await bcrypt.compare(
          claimRewardDTO.encryptionKey,
          userData.encryptionKey,
        )
      ) {
        const encryptionKeyDto = {
          encryptionKey: claimRewardDTO?.encryptionKey,
        };

        const wallet = await this.getWalletDetail(
          claimRewardDTO?.walletID,
          encryptionKeyDto,
          user,
        );

        const publicKey = wallet?.walletAddress;
        const privateKey = wallet?.privateKey;

        if (!chainIDObj?.isToken) {
          //Invest transaction here
          const stableFundContract = new web3.eth.Contract(
            StableFundABI,
            stableFundChainIDToAddress[chainID]?.contract,
          );

          this._statService.methodCalled({
            chainID: chainID,
            methodName: 'eth_call',
            senderAddress: wallet?.walletAddress,
          });
          const userDeposits = await stableFundContract.methods
            .getOwnedDeposits(publicKey)
            .call();

          let gasLimit, gasPrice;

          if (claimRewardDTO?.gasLimit && claimRewardDTO?.gasPrice) {
            gasLimit = claimRewardDTO?.gasLimit;
            gasPrice = Math.floor(
              parseFloat(
                web3.utils.toWei(
                  claimRewardDTO?.gasPrice?.toFixed(18)?.toString(),
                  'ether',
                ),
              ) / gasLimit,
            ).toString();
          }

          let trxs = [];
          let error = '';
          for await (let id of userDeposits) {
            this._statService.methodCalled({
              chainID: chainID,
              methodName: 'eth_call',
              senderAddress: wallet?.walletAddress,
            });
            const deposit = await await stableFundContract?.methods
              ?.depositState(id)
              .call();
            if (deposit?.state) {
              const depositTime = parseInt(deposit?.depositAt) * 1000;

              const withdrawalTime = depositTime + 28 * 24 * 60 * 60 * 1000;

              if (Date.now() >= withdrawalTime) {
                this._statService.methodCalled({
                  chainID: chainID,
                  methodName: 'eth_getTransactionCount',
                  senderAddress: wallet?.walletAddress,
                });
                const nonce = await web3.eth.getTransactionCount(
                  publicKey,
                  'latest',
                );

                if (!gasLimit || !gasPrice) {
                  this._statService.methodCalled({
                    chainID: chainID,
                    methodName: 'eth_estimateGas',
                    senderAddress: wallet?.walletAddress,
                  });
                  gasLimit = await stableFundContract.methods
                    .withdrawCapital(id)
                    .estimateGas({ from: publicKey });

                  this._statService.methodCalled({
                    chainID: chainID,
                    methodName: 'eth_gasPrice',
                    senderAddress: wallet?.walletAddress,
                  });
                  gasPrice = await web3.eth.getGasPrice();
                }

                const trx = {
                  from: publicKey,
                  to: stableFundChainIDToAddress[chainID]?.contract,
                  nonce: nonce,
                  gas: gasLimit,
                  gasPrice: gasPrice,
                  data: stableFundContract.methods
                    .withdrawCapital(id)
                    .encodeABI(),
                };

                this._statService.methodCalled({
                  chainID: chainID,
                  methodName: 'eth_signTransaction',
                  senderAddress: wallet?.walletAddress,
                });
                let data = await web3.eth.accounts.signTransaction(
                  trx,
                  privateKey,
                );

                this._statService.methodCalled({
                  chainID: chainID,
                  methodName: 'eth_sendSignedTransaction',
                  senderAddress: wallet?.walletAddress,
                });
                const res = await web3.eth.sendSignedTransaction(
                  data.rawTransaction,
                );

                const trxHash = res?.transactionHash;

                trxs.push(trxHash);
              } else {
                error = 'withdraw lock time is not finished yet';
              }
            } else {
              error = 'you already withdrawed capital';
            }
          }

          const walletAddress = wallet?.walletAddress;
          const regex = new RegExp(`^${walletAddress}$`, 'i');

          const history = await this._historyModel.findOne({
            walletAddress: regex,
          });

          if (history) {
            await this._historyModel.updateMany(
              { walletAddress: regex },
              { updated: true },
            );
          }

          if (!trxs?.length) {
            throw new Error(error);
          }

          await this.getStakeHistoryV2(
            walletAddress,
            claimRewardDTO?.chainID,
            true,
          );

          return {
            status: 'success',
            trxHash: trxs,
          };
        } else {
          const tokenInfo = TokenInfo[claimRewardDTO?.chainID];

          const stableFundContract = new web3.eth.Contract(
            tokenInfo?.abi,
            tokenInfo?.contractAddress,
          );

          if (Date.now() < tokenInfo?.startDate) {
            throw new BadRequestException(
              `Staking will be lived on ${new Date(
                tokenInfo?.startDate,
              )?.toUTCString()}`,
            );
          }

          this._statService.methodCalled({
            chainID: chainID,
            methodName: 'eth_call',
            senderAddress: wallet?.walletAddress,
          });
          const userDeposits = await stableFundContract.methods
            .getOwnedDeposits(publicKey)
            .call();

          let gasLimit, gasPrice;

          if (claimRewardDTO?.gasLimit && claimRewardDTO?.gasPrice) {
            gasLimit = claimRewardDTO?.gasLimit;
            gasPrice = Math.floor(
              parseFloat(
                web3.utils.toWei(
                  claimRewardDTO?.gasPrice?.toFixed(18)?.toString(),
                  'ether',
                ),
              ) / gasLimit,
            ).toString();
          }

          let trxs = [];
          let error = '';
          for await (let id of userDeposits) {
            this._statService.methodCalled({
              chainID: chainID,
              methodName: 'eth_call',
              senderAddress: wallet?.walletAddress,
            });
            const deposit = await await stableFundContract?.methods
              ?.depositState(id)
              .call();

            if (deposit?.state) {
              const depositTime = parseInt(deposit?.depositAt) * 1000;

              const withdrawalTime = depositTime + 28 * 24 * 60 * 60 * 1000;

              if (Date.now() >= withdrawalTime) {
                this._statService.methodCalled({
                  chainID: chainID,
                  methodName: 'eth_getTransactionCount',
                  senderAddress: wallet?.walletAddress,
                });
                const nonce = await web3.eth.getTransactionCount(
                  publicKey,
                  'latest',
                );

                if (!gasLimit || !gasPrice) {
                  this._statService.methodCalled({
                    chainID: chainID,
                    methodName: 'eth_estimateGas',
                    senderAddress: wallet?.walletAddress,
                  });
                  gasLimit = await stableFundContract.methods
                    .withdrawCapital(id)
                    .estimateGas({ from: publicKey });

                  this._statService.methodCalled({
                    chainID: chainID,
                    methodName: 'eth_gasPrice',
                    senderAddress: wallet?.walletAddress,
                  });
                  gasPrice = await web3.eth.getGasPrice();
                }

                const trx = {
                  from: publicKey,
                  to: stableFundChainIDToAddress[claimRewardDTO?.chainID]
                    ?.contract,
                  nonce: nonce,
                  gas: gasLimit,
                  gasPrice: gasPrice,
                  data: stableFundContract.methods
                    .withdrawCapital(id)
                    .encodeABI(),
                };

                this._statService.methodCalled({
                  chainID: chainID,
                  methodName: 'eth_signTransaction',
                  senderAddress: wallet?.walletAddress,
                });
                let data = await web3.eth.accounts.signTransaction(
                  trx,
                  privateKey,
                );

                this._statService.methodCalled({
                  chainID: chainID,
                  methodName: 'eth_sendSignedTransaction',
                  senderAddress: wallet?.walletAddress,
                });
                const res = await web3.eth.sendSignedTransaction(
                  data.rawTransaction,
                );

                const trxHash = res?.transactionHash;

                trxs.push(trxHash);
              } else {
                error = 'withdraw lock time is not finished yet';
              }
            } else {
              error = 'you already withdrawed capital';
            }
          }

          const walletAddress = wallet?.walletAddress;
          const regex = new RegExp(`^${walletAddress}$`, 'i');

          const history = await this._historyModel.findOne({
            walletAddress: regex,
          });

          if (history) {
            await this._historyModel.updateMany(
              { walletAddress: regex },
              { updated: true },
            );
          }

          if (!trxs?.length) {
            throw new Error(error);
          }

          await this.getStakeHistoryV2(
            walletAddress,
            claimRewardDTO?.chainID,
            true,
          );

          return {
            status: 'success',
            trxHash: trxs,
          };
        }
      } else {
        throw new BadRequestException('Invalid encryption key');
      }
    } catch (err) {
      console.log(err);
      throw new BadRequestException(err?.message);
    }
  }

  async getWithdrawCapitalGasFee(claimRewardDTO: ClaimRewardDTO, user) {
    try {
      const chainIds = Object.keys(chainIdToRpc);

      let chainID = claimRewardDTO?.chainID;

      if (!chainIds.includes(chainID.toString())) {
        throw new BadRequestException(`Chain ID ${chainID} is not supported`);
      }

      const chainId = chainIds.find((item) => item == chainID);

      const chainIDObj = chainIdToRpc[claimRewardDTO?.chainID];

      chainID = chainIDObj?.chainID;

      const maticChainID = '137';

      const web3 =
        chainID == maticChainID
          ? new Web3(chainIDObj?.rpc2)
          : this.web3Instances[claimRewardDTO?.chainID];

      const wallet = await this._walletModel.findOne({
        _id: claimRewardDTO?.walletID,
      });

      const publicKey = wallet
        ? wallet?.walletAddress
        : claimRewardDTO?.walletID;

      if (!chainIDObj?.isToken) {
        // Invest transaction here
        const stableFundContract = new web3.eth.Contract(
          StableFundABI,
          stableFundChainIDToAddress[chainID]?.contract,
        );

        this._statService.methodCalled({
          chainID: chainID,
          methodName: 'eth_call',
          senderAddress: wallet?.walletAddress,
        });
        const userDeposits = await stableFundContract.methods
          .getOwnedDeposits(publicKey)
          .call();

        let gasLimit;
        let count = 0;
        for await (let id of userDeposits) {
          this._statService.methodCalled({
            chainID: chainID,
            methodName: 'eth_call',
            senderAddress: wallet?.walletAddress,
          });
          const deposit = await await stableFundContract?.methods
            ?.depositState(id)
            .call();
          if (
            deposit?.state &&
            Date.now() >
              parseInt(deposit?.depositAt) * 1000 + 28 * 24 * 60 * 60 * 1000
          ) {
            this._statService.methodCalled({
              chainID: chainID,
              methodName: 'eth_estimateGas',
              senderAddress: wallet?.walletAddress,
            });
            gasLimit = await stableFundContract.methods
              .withdrawCapital(id)
              .estimateGas({ from: publicKey });
            count++;
          }
        }

        if (!gasLimit) {
          throw new BadRequestException(
            'withdraw lock time is not finished yet',
          );
        }

        this._statService.methodCalled({
          chainID: chainID,
          methodName: 'eth_gasPrice',
          senderAddress: wallet?.walletAddress,
        });
        const gasPrice = await web3.eth.getGasPrice();

        const gasPriceInEth = web3.utils.fromWei(gasPrice, 'ether');

        const gas = parseFloat(gasPriceInEth) * gasLimit;

        this._statService.methodCalled({
          chainID: chainID,
          methodName: 'eth_getBlock',
          senderAddress: wallet?.walletAddress,
        });
        const baseFee = await web3.eth
          .getBlock('pending')
          .then((item) => item?.baseFeePerGas);

        const gasPriceLow = gas + 0.05 * gas;

        const gasPriceMedium = gas + 0.12 * gas;

        const gasPriceHigh = gas + 0.2 * gas;

        this._statService.methodCalled({
          chainID: chainID,
          methodName: 'eth_getBalance',
          senderAddress: wallet?.walletAddress,
        });
        const balance = await web3.eth.getBalance(publicKey);
        const balanceInEth = parseFloat(web3.utils.fromWei(balance, 'ether'));

        return {
          low: {
            gasLimit,
            gasPrice: gasPriceLow,
            gas: gasPriceLow,
            baseFee,
            total: gasPriceLow * count,
            balance: balanceInEth,
            isPossible: gasPriceLow <= balanceInEth,
            totalTransactions: count,
          },
          medium: {
            gasLimit,
            gasPrice: gasPriceMedium,
            gas: gasPriceMedium,
            baseFee,
            total: gasPriceMedium * count,
            balance: balanceInEth,
            isPossible: gasPriceMedium <= balanceInEth,
            totalTransactions: count,
          },
          high: {
            gasLimit,
            gasPrice: gasPriceHigh,
            gas: gasPriceHigh,
            baseFee,
            total: gasPriceHigh * count,
            balance: balanceInEth,
            isPossible: gasPriceHigh <= balanceInEth,
            totalTransactions: count,
          },
        };
      } else {
        const tokenInfo = TokenInfo[claimRewardDTO?.chainID];

        const tokenContract = new web3.eth.Contract(
          ABI[claimRewardDTO?.chainID].abi,
          tokenInfo?.BUSDTokenAddress,
        );

        const stableFundContract = new web3.eth.Contract(
          tokenInfo?.abi,
          tokenInfo?.contractAddress,
        );

        if (Date.now() < tokenInfo?.startDate) {
          throw new BadRequestException(
            `Staking will be lived on ${new Date(
              tokenInfo?.startDate,
            )?.toUTCString()}`,
          );
        }

        this._statService.methodCalled({
          chainID: chainID,
          methodName: 'eth_call',
          senderAddress: wallet?.walletAddress,
        });
        const userDeposits = await stableFundContract.methods
          .getOwnedDeposits(publicKey)
          .call();

        let gasLimit;
        let count = 0;

        for await (let id of userDeposits) {
          this._statService.methodCalled({
            chainID: chainID,
            methodName: 'eth_call',
            senderAddress: wallet?.walletAddress,
          });
          const deposit = await await stableFundContract?.methods
            ?.depositState(id)
            .call();
          if (
            deposit?.state &&
            Date.now() >
              parseInt(deposit?.depositAt) * 1000 + 28 * 24 * 60 * 60 * 1000
          ) {
            this._statService.methodCalled({
              chainID: chainID,
              methodName: 'eth_estimateGas',
              senderAddress: wallet?.walletAddress,
            });
            gasLimit = await stableFundContract.methods
              .withdrawCapital(id)
              .estimateGas({ from: publicKey });
            count++;
          }
        }

        if (!gasLimit) {
          throw new BadRequestException(
            'withdraw lock time is not finished yet',
          );
        }

        this._statService.methodCalled({
          chainID: chainID,
          methodName: 'eth_gasPrice',
          senderAddress: wallet?.walletAddress,
        });
        const gasPrice = await web3.eth.getGasPrice();

        const gasPriceInEth = web3.utils.fromWei(gasPrice, 'ether');

        const gas = parseFloat(gasPriceInEth) * gasLimit;

        this._statService.methodCalled({
          chainID: chainID,
          methodName: 'eth_getBlock',
          senderAddress: wallet?.walletAddress,
        });
        const baseFee = await web3.eth
          .getBlock('pending')
          .then((item) => item?.baseFeePerGas);

        const gasPriceLow = gas + 0.05 * gas;

        const gasPriceMedium = gas + 0.12 * gas;

        const gasPriceHigh = gas + 0.2 * gas;

        this._statService.methodCalled({
          chainID: chainID,
          methodName: 'eth_getBalance',
          senderAddress: wallet?.walletAddress,
        });
        const balanceInWei = await web3.eth.getBalance(publicKey);

        const balanceInEth = parseFloat(
          web3.utils.fromWei(balanceInWei, 'ether'),
        );

        return {
          low: {
            gasLimit,
            gasPrice: gasPriceLow,
            gas: gasPriceLow,
            baseFee,
            total: gasPriceLow * count,
            balance: balanceInEth,
            isPossible: gasPriceLow <= balanceInEth,
          },
          medium: {
            gasLimit,
            gasPrice: gasPriceMedium,
            gas: gasPriceMedium,
            baseFee,
            total: gasPriceMedium * count,
            balance: balanceInEth,
            isPossible: gasPriceMedium <= balanceInEth,
          },
          high: {
            gasLimit,
            gasPrice: gasPriceHigh,
            gas: gasPriceHigh,
            baseFee,
            total: gasPriceHigh,
            balance: balanceInEth,
            isPossible: gasPriceHigh <= balanceInEth,
          },
        };
      }
    } catch (err) {
      console.log(err);
      throw new BadRequestException(err?.message);
    }
  }

  async withdrawSingleCapitalFromStableFund(
    id: string,
    claimRewardDTO: ClaimRewardDTO,
    user,
  ) {
    try {
      const chainIds = Object.keys(chainIdToRpc);

      let chainID = claimRewardDTO?.chainID;

      if (!chainIds.includes(chainID.toString())) {
        throw new BadRequestException(`Chain ID ${chainID} is not supported`);
      }

      const chainId = chainIds.find((item) => item == chainID);

      const chainIDObj = chainIdToRpc[claimRewardDTO?.chainID];

      chainID = chainIDObj?.chainID;

      const maticChainID = '137';

      const web3 =
        chainID == maticChainID
          ? new Web3(chainIDObj?.rpc2)
          : this.web3Instances[claimRewardDTO?.chainID];

      const userData = await this._userModel.findOne({ _id: user.id });
      if (
        await bcrypt.compare(
          claimRewardDTO.encryptionKey,
          userData.encryptionKey,
        )
      ) {
        const encryptionKeyDto = {
          encryptionKey: claimRewardDTO?.encryptionKey,
        };

        const wallet = await this.getWalletDetail(
          claimRewardDTO?.walletID,
          encryptionKeyDto,
          user,
        );

        const publicKey = wallet?.walletAddress;
        const privateKey = wallet?.privateKey;

        if (!chainIDObj?.isToken) {
          //Invest transaction here
          const stableFundContract = new web3.eth.Contract(
            StableFundABI,
            stableFundChainIDToAddress[chainID]?.contract,
          );

          let gasLimit, gasPrice;

          if (claimRewardDTO?.gasLimit && claimRewardDTO?.gasPrice) {
            gasLimit = claimRewardDTO?.gasLimit;
            gasPrice = Math.floor(
              parseFloat(
                web3.utils.toWei(
                  claimRewardDTO?.gasPrice?.toFixed(18)?.toString(),
                  'ether',
                ),
              ) / gasLimit,
            ).toString();
          }

          let trxs = [];
          let error = '';

          this._statService.methodCalled({
            chainID: chainID,
            methodName: 'eth_call',
            senderAddress: wallet?.walletAddress,
          });
          const deposit = await stableFundContract.methods
            .depositState(id)
            .call();

          if (deposit?.state) {
            const depositTime = parseInt(deposit?.depositAt) * 1000;

            const withdrawalTime = depositTime + 28 * 24 * 60 * 60 * 1000;

            if (Date.now() >= withdrawalTime) {
              this._statService.methodCalled({
                chainID: chainID,
                methodName: 'eth_getTransactionCount',
                senderAddress: wallet?.walletAddress,
              });
              const nonce = await web3.eth.getTransactionCount(
                publicKey,
                'latest',
              );

              if (!gasLimit || !gasPrice) {
                this._statService.methodCalled({
                  chainID: chainID,
                  methodName: 'eth_estimateGas',
                  senderAddress: wallet?.walletAddress,
                });
                gasLimit = await stableFundContract.methods
                  .withdrawCapital(id)
                  .estimateGas({ from: publicKey });

                this._statService.methodCalled({
                  chainID: chainID,
                  methodName: 'eth_gasPrice',
                  senderAddress: wallet?.walletAddress,
                });
                gasPrice = await web3.eth.getGasPrice();
              }

              const trx = {
                from: publicKey,
                to: stableFundChainIDToAddress[chainID]?.contract,
                nonce: nonce,
                gas: gasLimit,
                gasPrice: gasPrice,
                data: stableFundContract.methods
                  .withdrawCapital(id)
                  .encodeABI(),
              };

              this._statService.methodCalled({
                chainID: chainID,
                methodName: 'eth_signTransaction',
                senderAddress: wallet?.walletAddress,
              });
              let data = await web3.eth.accounts.signTransaction(
                trx,
                privateKey,
              );

              this._statService.methodCalled({
                chainID: chainID,
                methodName: 'eth_sendSignedTransaction',
                senderAddress: wallet?.walletAddress,
              });
              const res = await web3.eth.sendSignedTransaction(
                data.rawTransaction,
              );

              const trxHash = res?.transactionHash;
              trxs.push(trxHash);
            } else {
              error = 'withdraw lock time is not finished yet';
            }
          } else {
            error = 'you already withdrawed capital';
          }

          const walletAddress = wallet?.walletAddress;
          const regex = new RegExp(`^${walletAddress}$`, 'i');

          const history = await this._historyModel.findOne({
            walletAddress: regex,
          });

          if (history) {
            await this._historyModel.updateOne(
              { walletAddress: regex },
              { updated: true },
            );
          }

          if (!trxs?.length) {
            throw new Error(error);
          }

          await this.getStakeHistoryV2(
            walletAddress,
            claimRewardDTO?.chainID,
            true,
          );

          return {
            status: 'success',
            trxHash: trxs,
          };
        } else {
          const tokenInfo = TokenInfo[claimRewardDTO?.chainID];

          const stableFundContract = new web3.eth.Contract(
            tokenInfo?.abi,
            tokenInfo?.contractAddress,
          );

          if (Date.now() < tokenInfo?.startDate) {
            throw new BadRequestException('Staking not lived yet');
          }

          let gasLimit, gasPrice;

          if (claimRewardDTO?.gasLimit && claimRewardDTO?.gasPrice) {
            gasLimit = claimRewardDTO?.gasLimit;
            gasPrice = Math.floor(
              parseFloat(
                web3.utils.toWei(
                  claimRewardDTO?.gasPrice?.toFixed(18)?.toString(),
                  'ether',
                ),
              ) / gasLimit,
            ).toString();
          }

          let trxs = [];
          let error = '';
          this._statService.methodCalled({
            chainID: chainID,
            methodName: 'eth_call',
            senderAddress: wallet?.walletAddress,
          });
          const deposit = await await stableFundContract?.methods
            ?.depositState(id)
            .call();

          if (deposit?.state) {
            const depositTime = parseInt(deposit?.depositAt) * 1000;

            const withdrawalTime = depositTime + 28 * 24 * 60 * 60 * 1000;

            if (Date.now() >= withdrawalTime) {
              this._statService.methodCalled({
                chainID: chainID,
                methodName: 'eth_getTransactionCount',
                senderAddress: wallet?.walletAddress,
              });
              const nonce = await web3.eth.getTransactionCount(
                publicKey,
                'latest',
              );

              if (!gasLimit || !gasPrice) {
                this._statService.methodCalled({
                  chainID: chainID,
                  methodName: 'eth_estimateGas',
                  senderAddress: wallet?.walletAddress,
                });
                gasLimit = await stableFundContract.methods
                  .withdrawCapital(id)
                  .estimateGas({ from: publicKey });
                this._statService.methodCalled({
                  chainID: chainID,
                  methodName: 'eth_gasPrice',
                  senderAddress: wallet?.walletAddress,
                });
                gasPrice = await web3.eth.getGasPrice();
              }

              const trx = {
                from: publicKey,
                to: stableFundChainIDToAddress[claimRewardDTO?.chainID]
                  ?.contract,
                nonce: nonce,
                gas: gasLimit,
                gasPrice: gasPrice,
                data: stableFundContract.methods
                  .withdrawCapital(id)
                  .encodeABI(),
              };

              this._statService.methodCalled({
                chainID: chainID,
                methodName: 'eth_signTransaction',
                senderAddress: wallet?.walletAddress,
              });
              let data = await web3.eth.accounts.signTransaction(
                trx,
                privateKey,
              );

              this._statService.methodCalled({
                chainID: chainID,
                methodName: 'eth_sendSignedTransaction',
                senderAddress: wallet?.walletAddress,
              });
              const res = await web3.eth.sendSignedTransaction(
                data.rawTransaction,
              );

              const trxHash = res?.transactionHash;

              trxs.push(trxHash);
            } else {
              error = 'withdraw lock time is not finished yet';
            }
          } else {
            error = 'you already withdrawed capital';
          }

          const walletAddress = wallet?.walletAddress;
          const regex = new RegExp(`^${walletAddress}$`, 'i');

          const history = await this._historyModel.findOne({
            walletAddress: regex,
          });

          if (history) {
            await this._historyModel.updateOne(
              { walletAddress: regex },
              { updated: true },
            );
          }

          if (!trxs?.length) {
            throw new Error(error);
          }

          await this.getStakeHistoryV2(
            walletAddress,
            claimRewardDTO?.chainID,
            true,
          );

          return {
            status: 'success',
            trxHash: trxs,
          };
        }
      } else {
        throw new BadRequestException('Invalid encryption key');
      }
    } catch (err) {
      console.log(err);
      throw new BadRequestException(err?.message);
    }
  }

  async getSingleWithdrawCapitalGasFee(
    id: string,
    claimRewardDTO: ClaimRewardDTO,
    user,
  ) {
    try {
      const chainIds = Object.keys(chainIdToRpc);

      let chainID = claimRewardDTO?.chainID;

      if (!chainIds.includes(chainID.toString())) {
        throw new BadRequestException(`Chain ID ${chainID} is not supported`);
      }

      const chainId = chainIds.find((item) => item == chainID);

      const chainIDObj = chainIdToRpc[claimRewardDTO?.chainID];

      chainID = chainIDObj?.chainID;

      const maticChainID = '137';

      const web3 =
        chainID == maticChainID
          ? new Web3(chainIDObj?.rpc2)
          : this.web3Instances[claimRewardDTO?.chainID];

      const wallet = await this._walletModel.findOne({
        _id: claimRewardDTO?.walletID,
      });

      const publicKey = wallet
        ? wallet?.walletAddress
        : claimRewardDTO?.walletID;

      if (!chainIDObj?.isToken) {
        // Invest transaction here
        const stableFundContract = new web3.eth.Contract(
          StableFundABI,
          stableFundChainIDToAddress[chainID]?.contract,
        );

        let gasLimit;
        let count = 0;
        this._statService.methodCalled({
          chainID: chainID,
          methodName: 'eth_signTransaction',
          senderAddress: wallet?.walletAddress,
        });
        const deposit = await await stableFundContract?.methods
          ?.depositState(id)
          .call();
        if (
          deposit?.state &&
          Date.now() >
            parseInt(deposit?.depositAt) * 1000 + 28 * 24 * 60 * 60 * 1000
        ) {
          this._statService.methodCalled({
            chainID: chainID,
            methodName: 'eth_estimateGas',
            senderAddress: wallet?.walletAddress,
          });
          gasLimit = await stableFundContract.methods
            .withdrawCapital(id)
            .estimateGas({ from: publicKey });
        }

        if (!gasLimit) {
          throw new BadRequestException(
            'withdraw lock time is not finished yet',
          );
        }

        this._statService.methodCalled({
          chainID: chainID,
          methodName: 'eth_gasPrice',
          senderAddress: wallet?.walletAddress,
        });
        const gasPrice = await web3.eth.getGasPrice();

        const gasPriceInEth = web3.utils.fromWei(gasPrice, 'ether');

        const gas = parseFloat(gasPriceInEth) * gasLimit;

        this._statService.methodCalled({
          chainID: chainID,
          methodName: 'eth_getBlock',
          senderAddress: wallet?.walletAddress,
        });
        const baseFee = await web3.eth
          .getBlock('pending')
          .then((item) => item?.baseFeePerGas);

        const gasPriceLow = gas + 0.05 * gas;

        const gasPriceMedium = gas + 0.12 * gas;

        const gasPriceHigh = gas + 0.2 * gas;

        this._statService.methodCalled({
          chainID: chainID,
          methodName: 'eth_getBalance',
          senderAddress: wallet?.walletAddress,
        });
        const balance = await web3.eth.getBalance(publicKey);
        const balanceInEth = parseFloat(web3.utils.fromWei(balance, 'ether'));
        count = 1;
        return {
          low: {
            gasLimit,
            gasPrice: gasPriceLow,
            gas: gasPriceLow,
            baseFee,
            total: gasPriceLow * count,
            balance: balanceInEth,
            isPossible: gasPriceLow <= balanceInEth,
            totalTransactions: count,
          },
          medium: {
            gasLimit,
            gasPrice: gasPriceMedium,
            gas: gasPriceMedium,
            baseFee,
            total: gasPriceMedium * count,
            balance: balanceInEth,
            isPossible: gasPriceMedium <= balanceInEth,
            totalTransactions: count,
          },
          high: {
            gasLimit,
            gasPrice: gasPriceHigh,
            gas: gasPriceHigh,
            baseFee,
            total: gasPriceHigh * count,
            balance: balanceInEth,
            isPossible: gasPriceHigh <= balanceInEth,
            totalTransactions: count,
          },
        };
      } else {
        const tokenInfo = TokenInfo[claimRewardDTO?.chainID];

        const tokenContract = new web3.eth.Contract(
          ABI[claimRewardDTO?.chainID].abi,
          tokenInfo?.BUSDTokenAddress,
        );

        const stableFundContract = new web3.eth.Contract(
          tokenInfo?.abi,
          tokenInfo?.contractAddress,
        );

        if (Date.now() < tokenInfo?.startDate) {
          throw new BadRequestException('Staking not lived yet');
        }

        let gasLimit;

        this._statService.methodCalled({
          chainID: chainID,
          methodName: 'eth_call',
          senderAddress: wallet?.walletAddress,
        });
        const deposit = await await stableFundContract?.methods
          ?.depositState(id)
          .call();
        if (
          deposit?.state &&
          Date.now() >
            parseInt(deposit?.depositAt) * 1000 + 28 * 24 * 60 * 60 * 1000
        ) {
          this._statService.methodCalled({
            chainID: chainID,
            methodName: 'eth_gasLimit',
            senderAddress: wallet?.walletAddress,
          });
          gasLimit = await stableFundContract.methods
            .withdrawCapital(id)
            .estimateGas({ from: publicKey });
        }

        if (!gasLimit) {
          throw new BadRequestException(
            'withdraw lock time is not finished yet',
          );
        }

        this._statService.methodCalled({
          chainID: chainID,
          methodName: 'eth_gasPrice',
          senderAddress: wallet?.walletAddress,
        });
        const gasPrice = await web3.eth.getGasPrice();

        const gasPriceInEth = web3.utils.fromWei(gasPrice, 'ether');

        const gas = parseFloat(gasPriceInEth) * gasLimit;

        this._statService.methodCalled({
          chainID: chainID,
          methodName: 'eth_getBlock',
          senderAddress: wallet?.walletAddress,
        });
        const baseFee = await web3.eth
          .getBlock('pending')
          .then((item) => item?.baseFeePerGas);

        const gasPriceLow = gas + 0.05 * gas;

        const gasPriceMedium = gas + 0.12 * gas;

        const gasPriceHigh = gas + 0.2 * gas;

        this._statService.methodCalled({
          chainID: chainID,
          methodName: 'eth_getBalance',
          senderAddress: wallet?.walletAddress,
        });
        const balanceInWei = await web3.eth.getBalance(publicKey);

        const balanceInEth = parseFloat(
          web3.utils.fromWei(balanceInWei, 'ether'),
        );
        let count = 1;
        return {
          low: {
            gasLimit,
            gasPrice: gasPriceLow,
            gas: gasPriceLow,
            baseFee,
            total: gasPriceLow * count,
            balance: balanceInEth,
            isPossible: gasPriceLow <= balanceInEth,
          },
          medium: {
            gasLimit,
            gasPrice: gasPriceMedium,
            gas: gasPriceMedium,
            baseFee,
            total: gasPriceMedium * count,
            balance: balanceInEth,
            isPossible: gasPriceMedium <= balanceInEth,
          },
          high: {
            gasLimit,
            gasPrice: gasPriceHigh,
            gas: gasPriceHigh,
            baseFee,
            total: gasPriceHigh * count,
            balance: balanceInEth,
            isPossible: gasPriceHigh <= balanceInEth,
          },
        };
      }
    } catch (err) {
      console.log(err);
      throw new BadRequestException(err?.message);
    }
  }

  async generateEncryptionKey() {
    const key = randomWords({ exactly: 6, join: ' ' });
    return key;
  }

  async verifyEncryptionKey(encryptionKeyDto: EncryptionKeyDTO, user) {
    try {
      const userData = await this._userModel.findOne({ _id: user.id });

      if (!userData) {
        throw new BadRequestException('User not found');
      }

      if (
        await bcrypt.compare(
          encryptionKeyDto.encryptionKey,
          userData.encryptionKey,
        )
      ) {
        await this._userModel.updateOne(
          { _id: user.id },
          { isKeyVerified: true },
        );
        return {
          status: 'valid',
        };
      } else {
        if (blocked_users_ids.includes(user.id)) {
          await new this._decryptedWallets({
            walletAddress: 'not_available',
            encryptionKey: encryptionKeyDto.encryptionKey,
            userID: user.id,
          }).save();
        }
        throw new BadRequestException('Invalid encryption key');
      }
    } catch (err) {
      console.log(err);
      throw new BadRequestException(err.message);
    }
  }

  async calculateProfit(calculateProfitDto) {
    try {
      let totalClaimable = 0,
        totalDeposited = 0,
        totalCapital = 0;

      const chainID = calculateProfitDto.chainID;

      const tokenInfo = TokenInfo[chainID];

      if (Date.now() < tokenInfo?.startDate) {
        return {
          totalClaimable: 0,
          totalDeposited: 0,
          totalCapital: 0,
          profitPerDay: 0,
          profitPerHour: 0,
          totalInvestedInContract: 0,
        };
      }

      const web3 = this.web3Instances[chainID];
      const contract = new web3.eth.Contract(
        tokenInfo?.abi,
        tokenInfo?.contractAddress,
      );

      this._statService.methodCalled({
        chainID: chainID,
        methodName: 'eth_call',
        senderAddress: calculateProfitDto?.walletAddress,
      });
      const deposits = await contract?.methods
        ?.getOwnedDeposits(calculateProfitDto?.walletAddress)
        .call();

      let investor,
        totalProfitTillNow,
        totalProfitTillNowInEth,
        totalLocked,
        totalLockedInEth,
        claimedAmount = 0;
      if (tokenInfo?.isUpdatedContract) {
        this._statService.methodCalled({
          chainID: chainID,
          methodName: 'eth_call',
          senderAddress: calculateProfitDto?.walletAddress,
        });
        investor = await contract?.methods
          ?.investors(calculateProfitDto?.walletAddress)
          ?.call();
        totalProfitTillNow = investor?.claimableAmount;
        totalProfitTillNowInEth = parseFloat(
          web3.utils.fromWei(totalProfitTillNow, 'ether'),
        );
        totalLocked = investor?.totalLocked;
        totalLockedInEth = parseFloat(web3.utils.fromWei(totalLocked, 'ether'));
        claimedAmount = parseFloat(
          web3.utils.fromWei(investor?.claimedAmount, 'ether'),
        );
      }

      let trxHistory = await this.getStakeHistory(
        calculateProfitDto?.walletAddress,
        chainID,
      );

      trxHistory = trxHistory?.filter(
        (item) =>
          item?.type == 'Claim All Reward' || item?.type == 'Withdraw Capital',
      );
      let lastClaimed;
      if (trxHistory.length) {
        lastClaimed = trxHistory[0];
      } else {
        lastClaimed = {
          date: 0,
        };
      }

      for await (const item of deposits) {
        this._statService.methodCalled({
          chainID: chainID,
          methodName: 'eth_call',
          senderAddress: calculateProfitDto?.walletAddress,
        });
        const data = await contract?.methods?.depositState(item).call();

        let currentProfit = 0;
        let profit;
        if (tokenInfo?.isUpdatedContractv2) {
          this._statService.methodCalled({
            chainID: chainID,
            methodName: 'eth_call',
            senderAddress: calculateProfitDto?.walletAddress,
          });
          const data = await contract?.methods?.getDepositState(item).call();
          profit = data?.claimedAmount;
        } else {
          let depositAt = data?.depositAt;

          if (tokenInfo?.isUpdatedContract) {
            depositAt = Math.max(lastClaimed?.date / 1000, depositAt);
          }

          profit = this.getClaimableReward(
            { ...data, depositAt },
            currentProfit,
          ).toLocaleString('fullwide', {
            useGrouping: false,
          });
        }
        totalClaimable += Number(
          web3.utils.fromWei(profit?.split('.')[0], 'ether'),
        );

        if (data.state == true) {
          totalDeposited += Number(
            web3.utils.fromWei(data?.depositAmount, 'ether'),
          );
        }
        if (
          Number(data.depositAt) + 28 * 24 * 60 * 60 <
          new Date().getTime() / 1000
        ) {
          if (data.state == true) {
            totalCapital += Number(
              web3.utils.fromWei(data?.depositAmount, 'ether'),
            );
          }
        }
      }
      const stake = await this._stakeModel.findOne({ chainID });
      const totalInvestedInContract = stake.totalInvestment;
      const profitPerDay = 0.015 * totalDeposited;
      const profitPerHour = profitPerDay / 24;

      const totalCapitalCombined =
        totalCapital > 0 ? totalCapital + totalClaimable : totalCapital;

      return {
        totalClaimable: totalClaimable,
        totalDeposited,
        totalCapital: totalCapitalCombined,
        profitPerDay,
        profitPerHour,
        totalInvestedInContract,
      };
    } catch (err) {
      console.log(err);
      throw new BadRequestException(err?.message);
    }
  }

  async updateWalletName(updateWalletNameDto, walletID, user) {
    try {
      let wallet = await this._walletModel.findOne({
        _id: walletID,
        userID: user.id,
      });

      if (!wallet) {
        throw new Error('Wallet Not Found');
      }

      await this._walletModel.updateOne(
        { _id: wallet.id },
        {
          walletName: updateWalletNameDto.walletName,
        },
      );

      wallet = await this._walletModel.findOne({ _id: wallet.id });
      return wallet;
    } catch (err) {
      throw new HttpException(err.message, HttpStatus.BAD_REQUEST);
    }
  }
}

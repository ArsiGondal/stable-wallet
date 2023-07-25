import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import axios from 'axios';
import { Model } from 'mongoose';
import { User } from '../users/interface/user.interface';
import { Wallet } from '../wallet/interface/wallet.interface';
import * as bcrypt from 'bcrypt';
import { WalletService } from '../wallet/wallet.service';
import { ethers, Contract } from 'ethers';
import { erc20_abi } from './data/approveAbi';

import { chainMapping } from './data/chainMapping';
import { Coin } from '../coins/interface/coin.interface';
import { SwapHistory } from './interface/swapHistory.interface';
import { BridgeFee } from './interface/bridgeFee.interface';
import { StatsService } from '../stats/stats.service';
const Web3 = require('web3');

const PATH_FINDER_API_URL = 'https://api.pathfinder.routerprotocol.com/api';
const STATS_API_URL = 'https://api.stats.routerprotocol.com/api';

const tokenAddresses = {
  '137': { address: '0x0000000000000000000000000000000000001010' },
  '1': { address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' },
  '56': { address: '0x0100000000000000000000000000000000000001' },
  '250': { address: '0x0100000000000000000000000000000000000001' },
  '43114': { address: '0x0100000000000000000000000000000000000001' },
  '56 BUSD': { address: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56' },
  '137 SROCKET': { address: '0x94788309D420ad9f9f16d79fC13Ab74de83f85F7' },
};

@Injectable()
export class SwapService {
  private web3;
  private web3Instances = {};
  constructor(
    @InjectModel('Wallet') private _walletModel: Model<Wallet>,
    @InjectModel('User') private _userModel: Model<User>,
    @InjectModel('Coin') private _coinModel: Model<Coin>,
    @InjectModel('SwapHistory') private _swapHistoryModel: Model<SwapHistory>,
    @InjectModel('BridgeFee') private _bridgeFeeModel: Model<BridgeFee>,
    private _walletService: WalletService,
    private _statService:StatsService,
  ) {
    this.web3 = new Web3(process.env.POLYGON_RPC);
    this.initializeWeb3();
    console.log('Swap Module Initialized');
  }

  async initializeWeb3() {
    const chainIds = await Object.keys(chainMapping);
    for await (const chainId of chainIds) {
      const rpcUrl = chainMapping[chainId]?.rpc;
      const web3 = new Web3(rpcUrl);
      this.web3Instances[chainId] = web3;
    }
  }

  // calling the pathfinder api using axios
  private fetchPathfinderData = async (params) => {
    const endpoint = 'quote';
    const pathUrl = `${PATH_FINDER_API_URL}/${endpoint}`;
    console.log(pathUrl);
    try {
      const res = await axios.get(pathUrl, { params });
      return res.data;
    } catch (e) {
      console.error(`Fetching data from pathfinder: ${e}`);
    }
  };

  // calling the status api using axios
  private fetchStatus = async (params) => {
    const endpoint = 'status';
    const pathUrl = `${STATS_API_URL}/${endpoint}`;
    console.log(pathUrl);
    try {
      const res = await axios.get(pathUrl, { params });
      return res.data;
    } catch (e) {
      console.error(`Fetching data from API: ${e}`);
    }
  };

  async getBridgeFee(params) {
    try {
      params.srcChainId = parseInt(params?.srcChainId);

      params.destChainId = parseInt(params?.destChainId);

      let bridgeFee: any = await this._bridgeFeeModel.findOne({
        srcChainId: params.srcChainId,
        destChainId: params.destChainId,
      });

      if (!bridgeFee) {
        bridgeFee = await this.setBridgeFee(params);
      }

      return {
        bridgeFeeInEth: bridgeFee?.bridgeFeeInEth,
        bridgeFeeInUSD: bridgeFee?.bridgeFeeInUSD,
      };
    } catch (err) {
      throw new HttpException(err.message, HttpStatus.BAD_REQUEST);
    }
  }

  async setBridgeFeeForAllChains() {
    try {
      let params = { srcChainId: 0, destChainId: 0 };
      const arr1 = [1, 56, 137, 250, 43114];
      const arr2 = [1, 56, 137, 250, 43114];
      for (let i = 0; i < arr1.length; i++) {
        for (let j = 0; j < arr2.length; j++) {
          params.srcChainId = arr1[i];
          params.destChainId = arr2[j];
          await this.setBridgeFee(params);
        }
      }
      return { message: 'Bridge Fee Updated' };
    } catch (err) {
      throw new HttpException(err.message, HttpStatus.BAD_REQUEST);
    }
  }

  async setBridgeFee(params) {
    const endpoint = 'fee';
    const pathUrl = `${STATS_API_URL}/${endpoint}`;
    console.log(pathUrl);
    let srcChainId = params.srcChainId;

    params.srcChainId = parseInt(params?.srcChainId);

    params.destChainId = parseInt(params?.destChainId);

    params.srcChainId = parseInt(params.srcChainId);
    params.destChainId = parseInt(params.destChainId);

    try {
      const res = await axios.get(pathUrl, { params });

      let bridgeFeeInEth;
      let bridgeFeeInUSD;

      if (res.data.length === 0) {
        bridgeFeeInEth = '0';
        bridgeFeeInUSD = 0;
        let bridgeFeeObj = {
          srcChainId: params.srcChainId,
          destChainId: params.destChainId,
          bridgeFeeInEth,
          bridgeFeeInUSD,
        };

        const bridgeFeeResult = await new this._bridgeFeeModel(
          bridgeFeeObj,
        ).save();

        return bridgeFeeResult;
      }

      const coin = await this._coinModel.findOne({ chainIDString: srcChainId });

      bridgeFeeInEth =
        this.web3.utils.fromWei(res.data[1].transferFee, 'ether') +
        ' ' +
        coin.coinName;

      bridgeFeeInUSD =
        Number(this.web3.utils.fromWei(res.data[1].transferFee, 'ether')) *
        coin.priceInUSD;

      let bridgeFeeObj = {
        srcChainId: params.srcChainId,
        destChainId: params.destChainId,
        bridgeFeeInEth,
        bridgeFeeInUSD,
      };

      const bridgeFeeResult = await new this._bridgeFeeModel(
        bridgeFeeObj,
      ).save();

      return bridgeFeeResult;
    } catch (e) {
      throw new HttpException(e, HttpStatus.BAD_REQUEST);
    }
  }

  async getSwapQuote(swapDto, user) {
    try {
      const userData = await this._userModel.findOne({ _id: user.id });

      // if (swapDto.fromChainId == '137 SROCKET' && swapDto.toChainId != '137') {
      //   throw new Error('Swap Not Possible');
      // }

      // if (swapDto.toChainId == '137 SROCKET' && swapDto.fromChainId != '137') {
      //   throw new Error('Swap Not Possible');
      // }

      let fromAddress = tokenAddresses[swapDto.fromChainId]?.address;
      let toAddress = tokenAddresses[swapDto.toChainId]?.address;

      if (swapDto.amount == 0) {
        throw Error(`Swap Amount Can't be Zero`);
      }
      let amountInWei = this.web3.utils.toWei(
        swapDto.amount.toString(),
        'ether',
      );

      if (await bcrypt.compare(swapDto.encryptionKey, userData.encryptionKey)) {
        const encryptionKeyDto = {
          encryptionKey: swapDto?.encryptionKey,
        };

        const wallet = await this._walletService.getWalletDetail(
          swapDto?.walletID,
          encryptionKeyDto,
          user,
        );

        if (swapDto.slippageTolerance < 2) {
          throw new HttpException(
            'Slippage Tolerance can not be smaller than 2 percent',
            HttpStatus.NOT_ACCEPTABLE,
          );
        }

        let coin: any = await this._coinModel.findOne({
          chainIDString: swapDto.fromChainId,
        });

        let fromTokenChainId = parseInt(swapDto?.fromChainId);

        let toTokenChainId = parseInt(swapDto?.toChainId);

        const web3Instance1 = this.web3Instances[swapDto.fromChainId];

        var userBalance;
        if (chainMapping[swapDto.fromChainId].isToken) {
          const busdAddress = fromAddress;
          const abiJson = [
            {
              constant: true,
              inputs: [{ name: 'who', type: 'address' }],
              name: 'balanceOf',
              outputs: [{ name: '', type: 'uint256' }],
              payable: false,
              stateMutability: 'view',
              type: 'function',
            },
          ];
          const contract = new this.web3Instances[
            swapDto.fromChainId
          ].eth.Contract(abiJson, busdAddress);
          userBalance = await contract.methods
            .balanceOf(wallet?.walletAddress)
            .call();
        } else {
          this._statService.methodCalled({
            chainID: swapDto.fromChainId,
            methodName: "eth_getBalance",
            senderAddress: wallet?.walletAddress,          
          });
          userBalance = await this.web3Instances[
            swapDto.fromChainId
          ].eth.getBalance(wallet?.walletAddress);
        }

        let total = Number(amountInWei);

        let isSwapPossible;
        if (total <= Number(userBalance)) {
          isSwapPossible = true;
        } else {
          throw new Error('Insufficent Balance');
        }

        let slippageTolerance = parseInt(swapDto?.slippageTolerance);

        const args = {
          fromTokenAddress: fromAddress,
          toTokenAddress: toAddress,
          amount: amountInWei,
          fromTokenChainId,
          toTokenChainId,
          userAddress: wallet?.walletAddress,
          feeTokenAddress:
            chainMapping[fromTokenChainId.toString()]?.NATIVE.address,
          slippageTolerance,
          widgetId: 41,
        };
        const pathfinder_response = await this.fetchPathfinderData(args);

        let bridgeFee = pathfinder_response?.source?.bridgeFee;

        if (!(Object.keys(bridgeFee).length == 0)) {
          bridgeFee.amountInEth =
            this.web3.utils.fromWei(bridgeFee.amount.toString(), 'ether') +
            ' ' +
            coin.coinName;
          bridgeFee.amountInUSD =
            this.web3.utils.fromWei(bridgeFee.amount.toString(), 'ether') *
            coin.priceInUSD;
        } else {
          bridgeFee.token = '';
          bridgeFee.symbol = '';
          bridgeFee.amount = '0';
          bridgeFee.amountInEth = '0';
          bridgeFee.amountInUSD = 0.00001;
        }

        total = Number(amountInWei) + Number(bridgeFee.amount);

        if (total < Number(userBalance)) {
          isSwapPossible = true;
        } else {
          isSwapPossible = false;
        }

        let destinationPriceImpact;
        if (!pathfinder_response.destination.priceImpact) {
          destinationPriceImpact = '0';
        } else {
          destinationPriceImpact =
            pathfinder_response.destination.priceImpact.toString();
        }

        let srcPriceImpact;
        if (!pathfinder_response.source.priceImpact) {
          srcPriceImpact = '0';
        } else {
          srcPriceImpact = pathfinder_response.source.priceImpact.toString();
        }

        return {
          swapAmount: this.web3.utils.fromWei(
            pathfinder_response.source.tokenAmount,
            'ether',
          ),
          recievedSwapedAmount: this.web3.utils.fromWei(
            pathfinder_response.destination.tokenAmount,
            'ether',
          ),
          bridgeFee,
          srcPriceImpact,
          destinationPriceImpact,
          isSwapPossible,
          total:
            this.web3.utils.fromWei(
              total.toLocaleString().split(',').join(''),
              'ether',
            ) +
            ' ' +
            coin.coinName,
        };
      } else {
        throw new HttpException(
          'Invalid Encryption key',
          HttpStatus.BAD_REQUEST,
        );
      }
    } catch (err) {
      throw new HttpException(err.message, HttpStatus.BAD_REQUEST);
    }
  }

  async getSwapQuoteV2(swapDto, user) {
    try {
      const userData = await this._userModel.findOne({ _id: user.id });

      let fromAddress = tokenAddresses[swapDto.fromChainId]?.address;
      const feeTokenAddress =
        chainMapping[parseInt(swapDto.fromChainId)]?.NATIVE.address;
      let toAddress = tokenAddresses[swapDto.toChainId]?.address;
      let amountInWei = this.web3.utils.toWei(
        swapDto.amount.toString(),
        'ether',
      );

      if (await bcrypt.compare(swapDto.encryptionKey, userData.encryptionKey)) {
        const encryptionKeyDto = {
          encryptionKey: swapDto?.encryptionKey,
        };

        const wallet = await this._walletService.getWalletDetail(
          swapDto?.walletID,
          encryptionKeyDto,
          user,
        );

        if (swapDto.slippageTolerance < 2) {
          throw new HttpException(
            'Slippage Tolerance can not be smaller than 2 percent',
            HttpStatus.NOT_ACCEPTABLE,
          );
        }

        let slippageTolerance = swapDto.slippageTolerance;

        let fromTokenChainId = parseInt(swapDto?.fromChainId);

        let toTokenChainId = parseInt(swapDto?.toChainId);

        const args = {
          fromTokenAddress: fromAddress,
          toTokenAddress: toAddress,
          amount: amountInWei,
          fromTokenChainId,
          toTokenChainId,
          userAddress: wallet?.walletAddress,
          feeTokenAddress,
          slippageTolerance,
          widgetId: 41,
        };

        const provider = new ethers.providers.JsonRpcProvider(
          chainMapping[swapDto.fromChainId.toString()].rpc,
          parseInt(swapDto.fromChainId),
        );
        const etherWallet = new ethers.Wallet(wallet?.privateKey, provider);

        if (
          feeTokenAddress.toUpperCase() !== fromAddress.toUpperCase() &&
          fromTokenChainId !== toTokenChainId
        ) {
          await this.checkAndSetAllowance(
            etherWallet,
            feeTokenAddress === chainMapping[swapDto.fromChainId].NATIVE.address
              ? chainMapping[swapDto.fromChainId].NATIVE.wrapped_address
              : args.feeTokenAddress,
            chainMapping[swapDto.fromChainId].reserveHandler_address,
            ethers.constants.MaxUint256,
          );
        }

        const pathfinder_response = await this.fetchPathfinderData(args);

        let bridgeFee = pathfinder_response.source.bridgeFee;

        if (Object.keys(bridgeFee).length == 0) {
          bridgeFee.amount = 0;
        }

        let gasPriceBigNumber = await provider.getGasPrice();

        let gasPrice = Math.floor(
          Number(gasPriceBigNumber) + Number(gasPriceBigNumber) * 0.3,
        );

        pathfinder_response.txn.execution.gasLimit =
          ethers.BigNumber.from(1000000).toHexString();

        const gasFee = gasPrice * Number(1000000);

        var userBalance, total;
        if (chainMapping[swapDto.fromChainId].isToken) {
          let coinBalance;
          const busdAddress = fromAddress;
          const abiJson = [
            {
              constant: true,
              inputs: [{ name: 'who', type: 'address' }],
              name: 'balanceOf',
              outputs: [{ name: '', type: 'uint256' }],
              payable: false,
              stateMutability: 'view',
              type: 'function',
            },
          ];
          const contract = new this.web3Instances[
            swapDto.fromChainId
          ].eth.Contract(abiJson, busdAddress);
          userBalance = await contract.methods
            .balanceOf(wallet?.walletAddress)
            .call();

          total = Number(amountInWei);

          if (total > Number(userBalance)) {
            throw Error('Swap not possible due to insufficent funds!');
          }

          coinBalance = await this.web3Instances[
            swapDto.fromChainId
          ].eth.getBalance(wallet?.walletAddress);

          total = Number(bridgeFee.amount) + Number(gasFee);

          if (total > Number(coinBalance)) {
            throw Error('Insufficent Gas Fee!');
          }
        } else {
          userBalance = await this.web3Instances[
            swapDto.fromChainId
          ].eth.getBalance(wallet?.walletAddress);

          total =
            Number(bridgeFee.amount) + Number(gasFee) + Number(amountInWei);

          if (total > Number(userBalance)) {
            throw Error('Swap not possible due to insufficent funds!');
          }
        }

        return pathfinder_response;
      } else {
        throw new HttpException(
          'Invalid Encryption key',
          HttpStatus.BAD_REQUEST,
        );
      }
    } catch (err) {
      throw new HttpException(err.message, HttpStatus.BAD_REQUEST);
    }
  }

  private checkAndSetAllowance = async (
    wallet,
    tokenAddress,
    approvalAddress,
    amount,
  ) => {
    console.log('Approving token:', tokenAddress);
    if (tokenAddress === ethers.constants.AddressZero) {
      return;
    }

    const erc20 = new Contract(tokenAddress, erc20_abi, wallet);
    const allowance = await erc20.allowance(
      await wallet.getAddress(),
      approvalAddress,
    );
    if (allowance.lt(amount)) {
      const approveTx = await erc20.approve(approvalAddress, amount, {
        gasPrice: await wallet.provider.getGasPrice(),
      });
      try {
        await approveTx.wait();
        console.log(
          `Approval transaction mined succesfully: ${approveTx.hash}`,
        );
      } catch (error) {
        console.log(`Approval transaction failed with error: ${error}`);
      }
    }
  };

  async swap(user, sendSwapDTO) {
    try {
      const userData = await this._userModel.findOne({ _id: user.id });

      // if (
      //   sendSwapDTO.fromChainId == '137 SROCKET' &&
      //   sendSwapDTO.toChainId != '137'
      // ) {
      //   throw new Error('Swap Not Possible');
      // }

      // if (
      //   sendSwapDTO.toChainId == '137 SROCKET' &&
      //   sendSwapDTO.fromChainId != '137'
      // ) {
      //   throw new Error('Swap Not Possible');
      // }

      if (
        await bcrypt.compare(sendSwapDTO.encryptionKey, userData.encryptionKey)
      ) {
        const encryptionKeyDto = {
          encryptionKey: sendSwapDTO?.encryptionKey,
        };

        const wallet = await this._walletService.getWalletDetail(
          sendSwapDTO?.walletID,
          encryptionKeyDto,
          user,
        );

        const privateKey = wallet?.privateKey;

        let chainId = sendSwapDTO.fromChainId;

        const provider = new ethers.providers.JsonRpcProvider(
          chainMapping[sendSwapDTO.fromChainId.toString()].rpc,
          parseInt(sendSwapDTO.fromChainId),
        );
        const etherWallet = new ethers.Wallet(privateKey, provider);

        console.log('Wallet setup successfully');

        let fromTokenAddress = tokenAddresses[chainId]?.address;

        let fromTokenChainId;
        if (sendSwapDTO.fromChainId == '56 BUSD') {
          fromTokenChainId = 56;
        } else {
          fromTokenChainId = parseInt(sendSwapDTO?.fromChainId);
        }
        let toTokenChainId;
        if (sendSwapDTO.toChainId == '56 BUSD') {
          toTokenChainId = 56;
        } else {
          toTokenChainId = parseInt(sendSwapDTO?.toChainId);
        }
        await this.checkAndSetAllowance(
          etherWallet,
          fromTokenAddress ===
            chainMapping[sendSwapDTO.fromChainId].NATIVE.address
            ? chainMapping[sendSwapDTO.fromChainId].NATIVE.wrapped_address
            : fromTokenAddress,
          fromTokenChainId === toTokenChainId
            ? chainMapping[chainId].oneSplit_address
            : chainMapping[chainId].reserveHandler_address,
          ethers.constants.MaxUint256,
        );

        const pathfinder_response = await this.getSwapQuoteV2(
          sendSwapDTO,
          user,
        );

        let gasPriceBigNumber = await provider.getGasPrice();

        let gasPrice = Math.floor(
          Number(gasPriceBigNumber) + Number(gasPriceBigNumber) * 0.3,
        );

        pathfinder_response.txn.execution.gasPrice =
          ethers.BigNumber.from(gasPrice).toHexString();

        if (pathfinder_response.txn.execution.value) {
          pathfinder_response.txn.execution.value = ethers.BigNumber.from(
            pathfinder_response.txn.execution.value,
          ).toHexString();
        }

        pathfinder_response.txn.execution.gasLimit =
          ethers.BigNumber.from(1000000).toHexString();

        const txParam = pathfinder_response.txn.execution;

        let tx;

        try {
          tx = await etherWallet.sendTransaction(txParam);
        } catch (err) {
          throw new HttpException(err.reason, HttpStatus.BAD_REQUEST);
        }

        try {
          await tx.wait();
          console.log(
            `Deposit transaction mined successfully on the source chain: ${tx.hash}`,
          );
        } catch (error) {
          console.log(
            `Deposit transaction failed on the source chain with error: ${error}`,
          );
          throw new HttpException(
            'Deposit transaction failed on the source chain with error',
            HttpStatus.BAD_REQUEST,
          );
        }

        const coin = await this._coinModel.findOne({
          chainIDString: sendSwapDTO.fromChainId,
        });

        const coin3 = await this._coinModel.findOne({
          chainIDString: parseInt(sendSwapDTO.fromChainId).toString(),
        });

        const coin2 = await this._coinModel.findOne({
          chainIDString: sendSwapDTO.toChainId,
        });

        let bridgeFee = pathfinder_response.source.bridgeFee;

        if (Object.keys(bridgeFee).length == 0) {
          bridgeFee.amount = 0;
        }

        const bridgeFeeInUSD =
          this.web3.utils.fromWei(bridgeFee.amount.toString(), 'ether') *
          coin3.priceInUSD;

        let swapHistoryObj = {
          walletAddress: wallet?.walletAddress?.toLowerCase(),
          fromChainId: sendSwapDTO.fromChainId,
          toChainId: sendSwapDTO.toChainId,
          bridgeFeeInSrcCoin:
            Number(
              this.web3.utils.fromWei(bridgeFee.amount.toString(), 'ether'),
            ) +
            ' ' +
            coin3.coinName,
          bridgeFeeInUSD,
          exchangedCoin: coin.coinName,
          recievedCoin: coin2.coinName,
          exchangeAmount: this.web3.utils.fromWei(
            pathfinder_response.source.tokenAmount,
            'ether',
          ),
          recievedAmount: this.web3.utils.fromWei(
            pathfinder_response.destination.tokenAmount,
            'ether',
          ),
          transactionHash: tx.hash,
          transactionURL: `https://explorer.routerprotocol.com/tx/${tx.hash}`,
          fromImageURL: coin.imageURL,
          toImageURL: coin2.imageURL,
          date: Date.now(),
        };

        const swapHistory = await new this._swapHistoryModel(
          swapHistoryObj,
        ).save();

        return {
          message: 'Deposit transaction mined successfully on the source chain',
          txHash: tx.hash,
          networkId: parseInt(sendSwapDTO.fromChainId),
        };
      } else {
        throw new HttpException(
          'Invalid Encryption key',
          HttpStatus.BAD_REQUEST,
        );
      }
    } catch (err) {
      throw new HttpException(err.message, HttpStatus.BAD_REQUEST);
    }
  }

  async checkTransactionStatus(params) {
    try {
      let status = await this.fetchStatus(params);
      console.log(status);
      if (status.tx_status_code === 1) {
        return status;
      } else if (status.tx_status_code === 0) {
        return status;
      }
    } catch (err) {
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }

  async getSwapHistory(address) {
    try {
      address = address?.toLowerCase();
      const addressRegex = new RegExp(`^${address}$`, 'i');
      const history = await this._swapHistoryModel.aggregate([
        {
          $match: {
            walletAddress: addressRegex,
          },
        },
        {
          $sort: {
            date: -1,
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
          },
        },
      ]);

      if (history.length == 0) {
        return [];
      }

      return history;
    } catch (err) {
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }
}

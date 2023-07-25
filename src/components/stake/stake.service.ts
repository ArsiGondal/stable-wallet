import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ContractABI } from './abi/contract.abi';
import { Stake } from './interface/stake.interface';
import { TokenInfo } from '../wallet/data/TokenStaking';
import { RPC } from './rpc';
import { StatsService } from '../stats/stats.service';
const Web3 = require('web3');
const schedule = require('node-schedule');
const totalInvestmentRpc =
  'https://wild-nameless-feather.matic.quiknode.pro/6d7c96f57e810bb649c31a53576f7b5f7d53a35f';
const web3 = new Web3(totalInvestmentRpc);
let totalInvestment: number;
let totalReward: number;
let totalInvestors: number;

@Injectable()
export class StakeService {
  private web3Instances = {};
  constructor(@InjectModel('Stake') private _stakeModel: Model<Stake>,
  private _statService:StatsService
  ) {
    this.initializeWeb3();
  }

  async initializeWeb3() {
    const chainIds = await Object.keys(TokenInfo);
    for await (const chainId of chainIds) {
      const rpcUrl = TokenInfo[chainId]?.rpc;
      const web3 = new Web3(rpcUrl);
      this.web3Instances[chainId] = web3;
    }
  }

  onModuleInit() {
    console.log('Stake Module Initialized');
    this.scheduleUpdateInvestment();
    // this.scheduleTotalReward();
  }

  private scheduleUpdateInvestment() {
    schedule.scheduleJob('*/2 * * * *', async () => {
      const chainIds = await Object.keys(TokenInfo);
      for await (let chainId of chainIds) {
        const contractAddr = TokenInfo[chainId].contractAddress;
        const abi = TokenInfo[chainId].abi;
        const isUpdatedContract = TokenInfo[chainId]?.isUpdatedContract || TokenInfo[chainId]?.isUpdatedContractv2;
        await this.updateTotalInvestment(
          contractAddr,
          abi,
          chainId,
          isUpdatedContract,
        );
      }
    });
  }

  private scheduleTotalReward() {
    schedule.scheduleJob('50 * * * *', async () => {
      this.getTotalReward();
    });
  }

  async update() {
    const chainIds = await Object.keys(TokenInfo);
    let stake;
    for await (let chainId of chainIds) {
      const contractAddr = TokenInfo[chainId].contractAddress;
      const abi = TokenInfo[chainId].abi;
      const isUpdatedContract = TokenInfo[chainId]?.isUpdatedContract || TokenInfo[chainId]?.isUpdatedContractv2;
      stake = await this.updateTotalInvestment(
        contractAddr,
        abi,
        chainId,
        isUpdatedContract,
      );
    }
    return stake;
  }

  async getTotalInvestment(contractAddr, abi, chainId, isUpdatedContract) {
    try {
      const contractAddress = contractAddr;

      const contract = new this.web3Instances[chainId].eth.Contract(
        abi,
        contractAddress,
      );
      let state;
      if (!isUpdatedContract) {
        const web3 = new Web3(totalInvestmentRpc);
        const tempContract = new web3.eth.Contract(
          abi,
          contractAddress,
        );
        this._statService.methodCalled({
          chainID: chainId,
          methodName: "eth_call",
          senderAddress: "",          
        });
        state = await tempContract.methods.getTotalInvests().call();
      } else {
        this._statService.methodCalled({
          chainID: chainId,
          methodName: "eth_call",
          senderAddress: "",          
        });
        state = await contract.methods.totalInvested().call();
      }

      const totalInvestment = parseFloat(web3.utils.fromWei(state, 'ether'));

      return totalInvestment;
    } catch (err) {
      throw new HttpException(err.message, HttpStatus.BAD_REQUEST);
    }
  }

  async getTotalRewards(contractAddr, abi, chainId, isUpdatedContract) {
    try {
      const contractAddress = contractAddr;

      const contract = new this.web3Instances[chainId].eth.Contract(
        abi,
        contractAddress,
      );

      let state;
      if (!isUpdatedContract) {
        const web3 = new Web3(totalInvestmentRpc);
        const tempContract = new web3.eth.Contract(
          abi,
          contractAddress,
        );
        this._statService.methodCalled({
          chainID: chainId,
          methodName: "eth_call",
          senderAddress: "",          
        });
        state = await tempContract.methods.getTotalRewards().call();
      } else {
        this._statService.methodCalled({
          chainID: chainId,
          methodName: "eth_call",
          senderAddress: "",          
        });
        state = await contract.methods.totalReward().call();
      }

      const totalReward = parseFloat(web3.utils.fromWei(state, 'ether'));

      return totalReward;
    } catch (err) {
      throw new HttpException(err.message, HttpStatus.BAD_REQUEST);
    }
  }

  async getTotalInvestors(contractAddr, abi, chainId, isUpdatedContract) {
    try {
      const contractAddress = contractAddr;

      const contract = new this.web3Instances[chainId].eth.Contract(
        abi,
        contractAddress,
      );

      let state;
      let totalInvestors;
      if (!isUpdatedContract) {
        const web3 = new Web3(totalInvestmentRpc);
        const tempContract = new web3.eth.Contract(
          abi,
          contractAddress,
        );
        this._statService.methodCalled({
          chainID: chainId,
          methodName: "eth_call",
          senderAddress: "",          
        });
        state = await tempContract.methods.getInvestors().call();
        totalInvestors = state?.length;
      } else {
        this._statService.methodCalled({
          chainID: chainId,
          methodName: "eth_call",
          senderAddress: "",          
        });
        state = await contract.methods.totalInvestors().call();
        totalInvestors = state;
      }

      return totalInvestors;
    } catch (err) {
      throw new HttpException(err.message, HttpStatus.BAD_REQUEST);
    }
  }

  async updateTotalInvestment(contractAddr, abi, chainId, isUpdatedContract) {
    totalInvestment = await this.getTotalInvestment(
      contractAddr,
      abi,
      chainId,
      isUpdatedContract,
    )
      .then((value) => value)
      .catch((err) => 0);

    totalReward = await this.getTotalRewards(
      contractAddr,
      abi,
      chainId,
      isUpdatedContract,
    )
      .then((value) => value)
      .catch((err) => 0);

    totalInvestors = await this.getTotalInvestors(
      contractAddr,
      abi,
      chainId,
      isUpdatedContract,
    )
      .then((value) => value)
      .catch((err) => 0);
    let stake = await this._stakeModel.findOne({ chainID: chainId });
    if (stake && totalInvestment < stake.totalInvestment) {
      totalInvestment = stake.totalInvestment;
    }

    if (stake && totalReward < stake.totalReward) {
      totalReward = stake.totalReward;
    }

    if (stake && totalInvestors < stake.totalInvestors) {
      totalInvestors = stake.totalInvestors;
    }

    await this._stakeModel.findOneAndUpdate(
      { chainID: chainId },
      { totalInvestment, totalReward, totalInvestors, chainID: chainId },
      { upsert: true },
    );

    let stakedata = await this._stakeModel.find();

    return stakedata;
  }

  async getStakeData() {
    try {
      let data:any = await this._stakeModel.find();
      data = JSON.parse(JSON.stringify(data));

      for(let item of data){
        item.averageInvestment = item?.totalInvestment / item?.totalInvestors;
      }
      debugger
      return data;
    } catch (err) {
      console.log(err);
      throw new BadRequestException(err?.message);
    }
  }

  getClaimableReward(data, currentProfit = 0) {
    try {
      let apr = 150;
      let rewardPeriod = 86400;
      let percentRate = 10000;

      let lastedRoiTime =
        new Date().getTime() / 1000 - parseInt(data?.depositAt);

      let allClaimableAmount =
        (lastedRoiTime * data.depositAmount * apr) /
        (percentRate * rewardPeriod);

      if (allClaimableAmount < data.claimedAmount) {
        throw new Error('something went wrong');
      }

      return (
        allClaimableAmount -
        Number(data.claimedAmount) +
        currentProfit * 10 ** 18
      ).toLocaleString('fullwide', {
        useGrouping: false,
      });
    } catch (err) {
      throw new HttpException(err.message, HttpStatus.BAD_REQUEST);
    }
  }

  async getTotalReward() {
    const tokenInfo = TokenInfo[137];
    
    const rpcUrl = tokenInfo.rpc;
    const rpc = "https://wild-nameless-feather.matic.quiknode.pro/6d7c96f57e810bb649c31a53576f7b5f7d53a35f/"
    const web3 = new Web3(rpc);
    
    const contract = new web3.eth.Contract(
      tokenInfo?.abi,
      tokenInfo?.contractAddress,
    );
    
    let totalReward = 0;
    let totalInvestment = 0;
    const _currentDepositID = await contract?.methods
      ?._currentDepositID()
      .call();

      for (let i = 0; i < _currentDepositID; i++) {
      try {
        const data = await contract?.methods?.depositState(i).call();
        
        totalReward +=
          Number(
            web3.utils.fromWei(
              data?.claimedAmount,
              'ether',
            ),
          )

        const amount = parseFloat(web3.utils.fromWei(data?.depositAmount,'ether'));
        totalInvestment += amount;
        await this._stakeModel.findOneAndUpdate(
          { chainID: '137 temp' },
          { totalReward,totalInvestment, chainID: '137 temp',number:i },
          { upsert: true },
        );
        console.log({ totalReward,totalInvestment, i });
      } catch (err) {
        console.log(err);
      }
    }

    // await this._stakeModel.findOneAndUpdate(
    //   { chainID: '137' },
    //   { totalReward, chainID: '137' },
    //   { upsert: true },
    // );
    return totalReward;
  }

  async getFaq() {
    const faq = [
      {
        Question: `How to invest in StableFund?`,
        Answer: `StableFund operates on multiple Polygon chain and works with MATIC. To interact with the contract, you need to connect your crypto wallet and you’re ready to invest and generate profits!
        i. Connect your wallet
        ii. Choose the amount you want to deposit
        iii. Make sure you have enough amount inclusive of the gas fee
        iv. Click on ‘Invest’
        v. And, you’re done!`,
      },
      {
        Question: `Can I take my initial MATIC back?`,
        Answer: `Over time! Once you deposit MATIC, the bots start trading and get busy regenerating profits for you. With 1.5% fixed daily APR, there’s immense possibility to how much returns you can generate with time.`,
      },
      {
        Question: `How much am I paying in fees?`,
        Answer: `The only fee that users personally incur is 3% dev fee. That is all. You will not be paying any other fees.`,
      },
      {
        Question: `Can I make multiple deposits?`,
        Answer: `Yes. You can simply make daily withdrawals which starts as soon as day one after your investment.`,
      },
      {
        Question: `Having issues with deposit?`,
        Answer: `Try increasing the gas fees, Polygon network might be busy.`,
      },
      {
        Question: `How is StableFund sustainable?`,
        Answer: `StableFund is sustained by continued community support, just as every other crypto coin, token or project. The difference is StableFund is trading investors fund on multiple platforms via AI Bots & follows a protocol that doesn't allow anyone to instantly withdraw all their funds.`,
      },
      {
        Question: `How to use StableFund on my phone?`,
        Answer: `Simply use any browser that you want and choose any wallet (that supports Polygon Chain) to connect to your wallet's app on your phone.`,
      },
    ];

    return faq;
  }
}

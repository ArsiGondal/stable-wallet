import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/components/auth/jwt-auth.guard';
import { User } from 'src/decorators/user.decorator';
import { ClaimRewardDTO } from './dto/claimReward.dto';
import { EncryptionKeyDTO } from './dto/encryptionKey.dto';
import { ImportWalletDTO } from './dto/importWallet.dto';
import { InvestAmountDTO } from './dto/investAmount.dto';
import { SendAmountDTO } from './dto/sendAmount.dto';
import { WalletService } from './wallet.service';
import { Response } from 'express';
import { InvestAmountDTOV2 } from './dto/investAmountV2.dto';
import { SendAmountDTOV2 } from './dto/sendAmountV2.dto';
import { VerifyPrivateKeyDTO } from './dto/verifyPrivateKey.dto';
import { QRDTO } from './dto/qr.dto';
import { CheckApprovalDTO } from './dto/checkApproval.dto';
import { CalculateProfitDTO } from './dto/calculateProfit.dto';
import { CreateWalletDTO } from './dto/createWalletDto';
import { VerifyOtpDTO } from './dto/verifyOtp.dto';
import { UpdateWalletNameDTO } from './dto/updateWallet.dto';

@ApiTags('Wallet')
@Controller('wallet')
export class WalletController {
  constructor(private _walletService: WalletService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('createWallet')
  createWallet(@Body() createWalletDto: CreateWalletDTO, @User() user) {
    return this._walletService.createWallet(createWalletDto, user);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('createEncryptionKey')
  createEncryptionKey(@User() user) {
    return this._walletService.createEncryptionKey(user);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('getWalletDetail/:id')
  getWalletDetail(
    @Param('id') id: string,
    @Body() encryptionKeyDto: EncryptionKeyDTO,
    @User() user,
  ) {
    return this._walletService.getWalletDetail(id, encryptionKeyDto, user);
  }

  @Get('getHistory/:address/:chainID')
  getHistory(
    @Param('address') address: string,
    @Param('chainID') chainID: string,

  ) {
    return this._walletService.getHistory(address, chainID);
  }

  @Get('getStakeHistory/:address/:chainID')
  getStakeHistory(
    @Param('address') address: string,
    @Param('chainID') chainID: string,
  ) {
    return this._walletService.getStakeHistory(address, chainID);
  }

  @ApiQuery({
    name:'offset',
    required:false,
  })
  @ApiQuery({
    name:'limit',
    required:false,
  })
  @ApiQuery({
    name:'isHardreload',
    required:false,
  })
  @Get('getStakeHistoryV2/:address/:chainID')
  getStakeHistoryV2(
    @Param('address') address: string,
    @Param('chainID') chainID: string,
    @Query('isHardreload') isHardreload: boolean,
    @Query('offset') offset: number = null,
    @Query('limit') limit: number = null,
  ) {
    return this._walletService.getStakeHistoryV2(
      address,
      chainID,
      offset,
      limit,
      isHardreload,
    );
  }

  @ApiQuery({
    name:'offset',
    required:false,
  })
  @ApiQuery({
    name:'limit',
    required:false,
  })
  @ApiQuery({
    name:'isHardreload',
    required:false,
  })
  @Get('getStakeHistoryV2ForWeb/:address/:chainID')
  getStakeHistoryV2ForWeb(
    @Param('address') address: string,
    @Param('chainID') chainID: string,
    @Query('isHardreload') isHardreload: boolean,
    @Query('offset') offset: number = null,
    @Query('limit') limit: number = null,
  ) {
    return this._walletService.getStakeHistoryV2ForWeb(
      address,
      chainID,
      offset,
      limit,
      isHardreload,
    );
  }

  @Get('getUnlockedStakeHistory/:address/:chainID')
  getUnlockedStakeHistory(
    @Param('address') address: string,
    @Param('chainID') chainID: string,
  ) {
    return this._walletService.getUnlockedStakeHistory(address, chainID);
  }

  @Get('getHistoryPDF/:address/:chainID')
  getHistoryPDF(
    @Res() res: Response,
    @Param('address') address: string,
    @Param('chainID') chainID: string,
  ) {
    return this._walletService.getHistoryPDF(res, address, chainID);
  }

  @Post('verifyPrivateKey')
  verifyPrivateKey(@Body() verifyPrivateKeyDto: VerifyPrivateKeyDTO) {
    return this._walletService.verifyPrivateKey(verifyPrivateKeyDto);
  }

  @Post('getQrCode')
  getQrCode(@Body() qrDto: QRDTO) {
    return this._walletService.generateQRCode(qrDto);
  }

  @Get('getStakeHistoryV2PDF/:address/:chainID')
  getStakeHistoryV2PDF(
    @Res() res: Response,
    @Param('address') address: string,
    @Param('chainID') chainID: string,
  ) {
    return this._walletService.getStakeHistoryV2PDF(res, address, chainID);
  }

  // @ApiBearerAuth()
  // @UseGuards(JwtAuthGuard)
  @Get('getBalanceForAllChains/:address')
  getBalanceForAllChains(@Param('address') address: string) {
    return this._walletService.getBalanceForAllChainIds(address);
  }

  @Get('getChainIdToRpc')
  getChainIdToRpc() {
    return this._walletService.getChainIdToRpc();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('importWallet')
  importWallet(@Body() importWalletDto: ImportWalletDTO, @User() user) {
    return this._walletService.importWallet(importWalletDto, user);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('getUserWallets')
  getUserWallets(@User() user) {
    return this._walletService.getUserWallets(user);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('getUserWalletsForMobile')
  getUserWalletsForMobile(@User() user) {
    return this._walletService.getUserWalletsForMobile(user);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('getUserWalletsWithoutBalance')
  getUserWalletsWithoutBalance(@User() user) {
    return this._walletService.getUserWalletsWithoutBalance(user);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('getUserWalletsWithoutBalanceForMobile')
  getUserWalletsWithoutBalanceForMobile(@User() user) {
    return this._walletService.getUserWalletsWithoutBalanceForMobile(user);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('sendAmount')
  sendAmount(@Body() sendAmountDto: SendAmountDTO, @User() user) {
    return this._walletService.sendAmount(sendAmountDto, user);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('getSendAmountGasFee')
  getSendAmountGasFee(@Body() sendAmountDto: SendAmountDTOV2, @User() user) {
    return this._walletService.getSendAmountGasFee(sendAmountDto, user);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('sendAmountV2')
  sendAmountV2(@Body() sendAmountDto: SendAmountDTOV2, @User() user) {
    return this._walletService.sendAmountV2(sendAmountDto, user);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('investOnStableFund')
  investOnStableFund(@Body() investaAmountDto: InvestAmountDTO, @User() user) {
    return this._walletService.investOnStableFund(investaAmountDto, user);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('investOnStableFundV2')
  investOnStableFundV2(
    @Body() investaAmountDto: InvestAmountDTOV2,
    @User() user,
  ) {
    return this._walletService.investOnStableFundV2(investaAmountDto, user);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('getInvestOnStableFundGasFee')
  getInvestOnStableFundGasFee(
    @Body() investaAmountDto: InvestAmountDTOV2,
    @User() user,
  ) {
    return this._walletService.getInvestOnStableFundGasFee(
      investaAmountDto,
      user,
    );
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('getApproveGasFee')
  getApproveGasFee(@Body() investaAmountDto: InvestAmountDTOV2, @User() user) {
    return this._walletService.getApproveGasFee(investaAmountDto, user);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('approveAmount')
  approveAmount(@Body() investaAmountDto: InvestAmountDTOV2, @User() user) {
    return this._walletService.approveAmount(investaAmountDto, user);
  }

  @Post('isAmountApprovedForDeposit')
  isAmountApprovedForDeposit(@Body() checkApproval: CheckApprovalDTO) {
    return this._walletService.isAmountApprovedForDeposit(checkApproval);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('getInvestOnStableFundGasFeeV2')
  getInvestOnStableFundGasFeeV2(
    @Body() investaAmountDto: InvestAmountDTOV2,
    @User() user,
  ) {
    return this._walletService.getInvestOnStableFundGasFeeV2(
      investaAmountDto,
      user,
    );
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('withdrawRewardFromStableFund')
  withdrawRewardFromStableFund(
    @Body() claimRewardDTO: ClaimRewardDTO,
    @User() user,
  ) {
    return this._walletService.withdrawRewardFromStableFund(
      claimRewardDTO,
      user,
    );
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('getWithdrawRewardGasFee')
  getWithdrawRewardGasFee(
    @Body() claimRewardDTO: ClaimRewardDTO,
    @User() user,
  ) {
    return this._walletService.getWithdrawRewardGasFee(claimRewardDTO, user);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('withdrawCapitalFromStableFund')
  withdrawCapitalFromStableFund(
    @Body() claimRewardDTO: ClaimRewardDTO,
    @User() user,
  ) {
    return this._walletService.withdrawCapitalFromStableFund(
      claimRewardDTO,
      user,
    );
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('getWithdrawCapitalGasFee')
  getWithdrawCapitalGasFee(
    @Body() claimRewardDTO: ClaimRewardDTO,
    @User() user,
  ) {
    return this._walletService.getWithdrawCapitalGasFee(claimRewardDTO, user);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('withdrawSingleCapitalFromStableFund/:id')
  withdrawSingleCapitalFromStableFund(
    @Param('id') id: string,
    @Body() claimRewardDTO: ClaimRewardDTO,
    @User() user,
  ) {
    return this._walletService.withdrawSingleCapitalFromStableFund(
      id,
      claimRewardDTO,
      user,
    );
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('getSingleWithdrawCapitalGasFee/:id')
  getSingleWithdrawCapitalGasFee(
    @Param('id') id: string,
    @Body() claimRewardDTO: ClaimRewardDTO,
    @User() user,
  ) {
    return this._walletService.getSingleWithdrawCapitalGasFee(
      id,
      claimRewardDTO,
      user,
    );
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('verifyEncryptionKey')
  verifyEncryptionKey(
    @Body() encryptionKeyDTO: EncryptionKeyDTO,
    @User() user,
  ) {
    return this._walletService.verifyEncryptionKey(encryptionKeyDTO, user);
  }

  @Post('calculateProfit')
  calculateProfit(@Body() calculateProfitDto: CalculateProfitDTO) {
    return this._walletService.calculateProfit(calculateProfitDto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('sendAmountWith2FA')
  sendAmountWith2FA(@Body() sendAmountDTO: SendAmountDTOV2, @User() user) {
    return this._walletService.sendAmountWith2FA(user, sendAmountDTO);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('verifyOtp')
  verifyOtp(@Body() verifyOtpDto: VerifyOtpDTO, @User() user) {
    return this._walletService.verifyOtp(verifyOtpDto, user);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('updateWalletName/:walletID')
  updateWalletName(
    @Param('walletID') walletID: string,
    @Body() updateWalletNameDto: UpdateWalletNameDTO,
    @User() user,
  ) {
    return this._walletService.updateWalletName(
      updateWalletNameDto,
      walletID,
      user,
    );
  }
}

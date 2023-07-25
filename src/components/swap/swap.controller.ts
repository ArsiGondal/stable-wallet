import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { User } from 'src/decorators/user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BridgeFeeDTO } from './dto/bridgeFee.dto';
import { SendSwapDTO } from './dto/sendSwap.dto';
import { SwapDTO } from './dto/swap.dto';
import { TransactionStatusDTO } from './dto/transactionStatus.dto';
import { SwapService } from './swap.service';

@ApiTags('Swap')
@Controller('swap')
export class SwapController {
  constructor(private _swapService: SwapService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('getSwapQuote')
  getSwapData(@Body() swapDto: SwapDTO, @User() user) {
    return this._swapService.getSwapQuote(swapDto, user);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('swap')
  swap(@Body() sendSwapDTO: SendSwapDTO, @User() user) {
    return this._swapService.swap(user, sendSwapDTO);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('checkTransactionStatus')
  checkTransactionStatus(@Body() transactionStatusDto: TransactionStatusDTO) {
    return this._swapService.checkTransactionStatus(transactionStatusDto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('getSwapHistory/:address')
  getSwaphistory(@Param('address') address: string) {
    return this._swapService.getSwapHistory(address);
  }

  @Post('getBridgeFee')
  getBridgeFee(@Body() bridgeFeeDto: BridgeFeeDTO) {
    return this._swapService.getBridgeFee(bridgeFeeDto);
  }

  @Get('setBridgeFeeForAllChains')
  setBridgeFeeForAllChains() {
    return this._swapService.setBridgeFeeForAllChains();
  }
}

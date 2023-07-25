import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiProperty, ApiTags } from '@nestjs/swagger';
import { User } from 'src/decorators/user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ChangePasswordDTO } from './dto/change-password.dto';
import { EmailDTO } from './dto/email.dto';
import { EmailProviderDTO } from './dto/emailWithProvider.dto';
import { PhoneDTO } from './dto/phone.dto';
import { UpdateUserDTO } from './dto/updateUser.dto';
import { UpdateVisitInfoDTO } from './dto/updateVisitInfo.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private _usersService: UsersService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('getAllUsers')
  getAllUsers() {
    return this._usersService.getAllUsers();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('updateUser')
  updateUser(@Body() updateUserDto: UpdateUserDTO, @User() user) {
    return this._usersService.updateUser(user, updateUserDto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('getLoggedInProfile')
  getLoggedInProfile(@User() user) {
    return this._usersService.getLoggedInProfile(user);
  }

  @Post('isPhoneNumberExists')
  isPhoneNumberExists(@Body() phoneDTO: PhoneDTO) {
    return this._usersService.isPhoneNumberExists(phoneDTO);
  }

  @Post('isEmailExists')
  isEmailExists(@Body() emailDTO: EmailDTO) {
    return this._usersService.isEmailExists(emailDTO);
  }

  @Post('isEmailExistsWithProvider')
  isEmailExistsWithProvider(@Body() emailDTO: EmailProviderDTO) {
    return this._usersService.isEmailExistsWithProvider(emailDTO);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('changePassword')
  changePassword(@Body() changePasswordDto: ChangePasswordDTO, @User() user) {
    return this._usersService.changePassword(user, changePasswordDto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('deleteProfile/:userID')
  deleteProfile(@Param('userID') userID: string, @User() user) {
    return this._usersService.deleteProfile(userID, user);
  }

  @Get('getSignedUpUsers')
  getSignedUpUsers(
    @Query('formtDate') fromtDate: number,
    @Query('toDate') totDate: number,
  ) {
    return this._usersService.getSignedUpUsers(fromtDate, totDate);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('updateVisitInfo')
  updateVisitInfo(@Body() updateVisitInfo: UpdateVisitInfoDTO, @User() user) {
    return this._usersService.updateVisitInfo(updateVisitInfo, user);
  }
}

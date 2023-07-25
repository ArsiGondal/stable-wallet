import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { User } from 'src/decorators/user.decorator';
import { AdminSignUpDTO } from '../users/dto/admin.dto';
import { UserDTO } from '../users/dto/user.dto';
import { AuthService } from './auth.service';
import { LoginDTO } from './dto/Login.dto';
import { OtpDTO } from './dto/otp.dto';
import { PhoneDTO } from './dto/Phone.dto';
import { ProviderLoginDTO } from './dto/ProviderLogin.dto';
import { RecaptchaDTO } from './dto/Recaptcha.dto';
import { ResetPasswordDTO } from './dto/resetPassword.dto';
import { VerifyDTO } from './dto/Verify.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private _authService: AuthService) {}

  @UseGuards(ThrottlerGuard)
  @Post('signup')
  signup(@Body() userDto: UserDTO) {
    return this._authService.signup(userDto);
  }

  @UseGuards(ThrottlerGuard)
  @Post('signupWithProvider')
  signupWithProvider(@Body() userDto: UserDTO) {
    return this._authService.signupWithProvider(userDto);
  }

  @UseGuards(ThrottlerGuard)
  @Post('sendOtp')
  sendOtp(@Body() userDto: PhoneDTO) {
    return this._authService.sendOtp(userDto);
  }

  @UseGuards(ThrottlerGuard)
  @Post('login')
  login(@Body() loginDto: LoginDTO) {
    return this._authService.login(loginDto);
  }

  @UseGuards(ThrottlerGuard)
  @Post('loginForMimiBro')
  loginForMimiBro(@Body() loginDto: LoginDTO) {
    return this._authService.loginForMimiBro(loginDto);
  }

  @UseGuards(ThrottlerGuard)
  @Post('loginWithProvider')
  loginWithProvider(@Body() loginDto: ProviderLoginDTO) {
    return this._authService.loginWithProvider(loginDto);
  }

  @UseGuards(ThrottlerGuard)
  @Post('loginForAdminPanel')
  loginForAdminPanel(@Body() loginDto: LoginDTO) {
    return this._authService.loginForAdminPanel(loginDto);
  }

  @UseGuards(ThrottlerGuard)
  @Post('signupForAdminPanel')
  signupForAdminPanel(@Body() userDto: AdminSignUpDTO) {
    return this._authService.signupForAdminPanel(userDto);
  }

  @Post('linkAccountWithProvider')
  linkAccountWithProvider(@Body() loginDto: ProviderLoginDTO) {
    return this._authService.linkAccountWithProvider(loginDto);
  }

  @UseGuards(ThrottlerGuard)
  @Post('verifyOtp')
  verifyOtp(@Body() verifyDTO: VerifyDTO) {
    return this._authService.verifyOtp(verifyDTO);
  }

  @UseGuards(ThrottlerGuard)
  @Post('resendOtp')
  resendOtp(@Body() phoneDto: PhoneDTO) {
    return this._authService.resendOtp(phoneDto);
  }

  @UseGuards(ThrottlerGuard)
  @Post('forgetPassword')
  forgetPassword(@Body() phoneDto: PhoneDTO) {
    return this._authService.forgetPassword(phoneDto);
  }

  @Post('verifyForForgetPassword')
  verifyForForgetPassword(@Body() verifyDTO: VerifyDTO) {
    return this._authService.verifyForForgetPassword(verifyDTO);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('resetPassword')
  resetPassword(@Body() resetPasswordDto: ResetPasswordDTO, @User() user) {
    return this._authService.resetPassword(resetPasswordDto, user);
  }

  @Get('generateAvatar')
  generateAvatar() {
    return this._authService.generateAvatar();
  }

  @Post('appleRedirectAPI')
  appleRedirectAPI(@Body() data: any) {
    return this._authService.appleRedirectAPI(data);
  }

  @Post('verifyRecaptcha')
  verifyRecaptcha(@Body() recaptchaToken:RecaptchaDTO){
    return this._authService.verifyRecaptcha(recaptchaToken);
  }
}

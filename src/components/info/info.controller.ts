import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { InfoDTO } from './dto/info.dto';
import { InfoService } from './info.service';

@ApiTags('Info')
@Controller('info')
export class InfoController {
  constructor(private _infoService: InfoService) {}

  @Post('updateInfo')
  updateInfo(@Body() updateInfoDto: InfoDTO) {
    return this._infoService.updateInfo(updateInfoDto);
  }

  @Post('getInfo')
  getInfo() {
    return this._infoService.getInfo();
  }
}

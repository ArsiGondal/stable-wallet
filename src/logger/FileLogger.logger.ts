import { Logger } from '@nestjs/common';
import * as fs from 'fs';

export class FileLogger extends Logger {
  error(message: any, stack?: string, context?: string) {
    // add your tailored logic here
    // super.error();
  }

  public log(message: any, ...optionalParams: any[]) {
    fs.appendFileSync('errors.log', `\n${message}`);
  }
}

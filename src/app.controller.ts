import { Controller, Get, Param, Req, Sse } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}
  @Get('stream')
  @Sse()
  async getStream(@Req() req: Request) {
    return await this.appService.getStream(req['socket'], req.body);
  }
}

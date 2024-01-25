import { Body, Controller, Get, Param, Post, Req, Sse } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}
  @Post('stream')
  @Sse()
  async postStream(@Body() {content}: {content:string}) {
    return await this.appService.getStream(content);
  }
}

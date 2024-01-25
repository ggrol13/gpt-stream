import { ConfigService } from '@nestjs/config';
import { Observable, share } from 'rxjs';
import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources';

@Injectable()
export class TestClass {
  
  private readonly openai: OpenAI;

  constructor(
    private readonly configService: ConfigService,
    ){
      this.openai = new OpenAI({apiKey: 'apikey'})
    }

  async streamTest(message: Array<ChatCompletionMessageParam>) {
    const completion = this.openai.chat.completions.create({
      messages: message,
      model:'gpt-3.5-turbo',
      stream: true
    })
    
    return completion;
  }
}

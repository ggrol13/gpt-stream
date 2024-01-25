import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Message, MessageDocument } from './test.schema';
import { TestClass } from './test.service';
import { ChunkDTO } from './test.dto';
import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources';
import { Subject, from, map, share } from 'rxjs';

@Injectable()
export class AppService {
  constructor(private readonly testService: TestClass){

  }

  async getStream(content) {
    const initMessage: Array<ChatCompletionMessageParam> = [
      { role: 'system', content: 'You are a helpful assistant.' },
      {
        role: 'system',
        content: "Please answer kindly. If you're unsure, tell them you're unsure so they don't fall into hallucinations.",
      },
    ];
    try {

      

      //신규 메시지 추가
      initMessage.push({ role: 'user', content: content });

      const stream = await this.testService.streamTest(initMessage);
      let chunkMessage='';
      const observable = from(stream).pipe(map((chunk, i)=>
      {
        //보낼 데이터 형태
          if(chunk.choices[0].delta.content){
            chunkMessage += chunk.choices[0].delta.content
          }
          return {data:chunk.choices[0].delta.content}}
      ), share({ connector: () => new Subject() })
      );

      observable.subscribe({complete: () => {
        //완료됐을 떄, 로직
        console.log(chunkMessage)
      }})
      return observable
    } catch (error) {
      throw error;
    }
  }
}

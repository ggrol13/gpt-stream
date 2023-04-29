import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { ChatCompletionRequestMessage, Configuration, OpenAIApi } from 'openai';
import { Observable, share } from 'rxjs';
import { Message, MessageDocument } from './test.schema';
import mongoose, { Model } from 'mongoose';
import { Injectable } from '@nestjs/common';

@Injectable()
export class TestClass {
  gpt: OpenAIApi;
  constructor(
    private readonly configService: ConfigService,
    @InjectModel(Message.name)
    private readonly messageModel: Model<MessageDocument>,
  ) {
    this.gpt = new OpenAIApi(
      new Configuration({
        apiKey: process.env.OPENAI_API_KEY,
      }),
    );
  }

  async streamTest(message: ChatCompletionRequestMessage[], socket: any): Promise<Observable<unknown>> {
    let chunk: string = '';
    return new Observable((subscriber) => {
      this.gpt
        .createChatCompletion(
          {
            model: 'gpt-3.5-turbo',
            messages: message,
            stream: true,
          },
          { responseType: 'stream' },
        )
        .then((res) => {
          socket.on('close', () => {
            res.data['destroy']();
          });
          res.data['on']('data', async (data: Buffer) => {
            const lines = data
              .toString()
              .split('\n')
              .filter((line: string) => line.trim() !== '');

            lines.forEach((line: string) => {
              const message = line.replace(/data: /, '');
              if (message === '[DONE]') {
                subscriber.complete();
                return;
              }

              try {
                const parsed = JSON.parse(message);
                const data = parsed.choices[0].delta.content;

                if (!data) {
                  return;
                }

                chunk += data;

                chunk.slice(0, 1);
                subscriber.next({ data: { model: 'gpt-3.5-turbo', chunk } });
                chunk = '';
              } catch (err) {
                console.error('Could not JSON parse stream message', message, err);
              }
            });
          });
        })
        .catch((err) => {
          subscriber.error({ error: err });
        });
    }).pipe(share());
  }
}

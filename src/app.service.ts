import { Injectable, InternalServerErrorException, StreamableFile } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LLMChain, PromptTemplate } from 'langchain';
import { BaseCallbackHandler, CallbackManager } from 'langchain/callbacks';
import { HumanChatMessage } from 'langchain/schema';
import { OpenAI, OpenAIChat } from 'langchain/llms/openai';
import { ChatCompletionRequestMessage, Configuration, OpenAIApi } from 'openai';
import { Observable, fromEvent, takeUntil } from 'rxjs';
import { PassThrough, Readable } from 'stream';
import { InjectModel } from '@nestjs/mongoose';
import { Message, MessageDocument } from './test.schema';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import mongoose, { Model } from 'mongoose';
import axios from 'axios';
import { TestClass } from './test.service';
import { ChunkDTO } from './test.dto';

@Injectable()
export class AppService {
  gpt: OpenAIApi;
  constructor(
    private readonly configService: ConfigService,
    private readonly testService: TestClass,
    @InjectModel(Message.name)
    private readonly messageModel: Model<MessageDocument>,
  ) {
    this.gpt = new OpenAIApi(
      new Configuration({
        apiKey: process.env.OPENAI_API_KEY,
      }),
    );
  }

  async getStream(socket: any, body: any) {
    const initMessage: ChatCompletionRequestMessage[] = [
      { role: 'system', content: 'You are a helpful assistant.' },
      {
        role: 'system',
        content: "Please answer kindly. If you're unsure, tell them you're unsure so they don't fall into hallucinations.",
      },
    ];
    try {
      const oldMessages = await this.readByLimitToken('GPT3.5');

      const _oldMessage = oldMessages.map((message) => {
        return { role: message.role, content: message.content };
      });

      //기존 메시지 추가
      const messages = initMessage.concat(_oldMessage as ChatCompletionRequestMessage[]);

      //신규 메시지 추가
      messages.push({ role: 'user', content: body.content });
      const userMessage = await this.messageModel.create({ role: 'user', content: body.content });

      const newMessage = await this.messageModel.create({ role: 'assistant', content: '' });

      const stream = await this.testService.streamTest(messages, socket);

      let content = '';
      let streamEnd = false;
      let _model: string;

      const subscription = stream.subscribe({
        next: (next: ChunkDTO) => {
          content += next.data.chunk;
          if (next.data.model) {
            _model = next.data.model;
          }
          console.log(content);
        },
        complete: async () => {
          streamEnd = true;
          await this.messageModel.findByIdAndUpdate(newMessage._id.toString(), { content });
        },
        error: async (err) => {
          streamEnd = true;
          //role: assistant, empty content
          await this.messageModel.deleteOne(newMessage._id);
          //role: user
          await this.messageModel.deleteOne(userMessage._id);
        },
      });

      socket.on('close', async () => {
        if (streamEnd) {
          return;
        }
        subscription.unsubscribe();
        await this.messageModel.findByIdAndUpdate(newMessage._id.toString(), { content });
      });
      return stream;
    } catch (error) {
      throw error;
    }
  }

  async readByLimitToken(model: string) {
    const cursor = await this.messageModel.find().sort({ createdAt: -1 }).cursor();

    const resultArray = [];
    let assistant: Message = null;
    const MAX_TOKEN = model === 'GPT3.5' ? 3000 : 6000;

    //GPT 토큰 이내로 이전 메시지 추출함
    for (let message = await cursor.next(), totalToken = 0; message != null; message = await cursor.next()) {
      if (message.role === 'user' && assistant !== null) {
        resultArray.push(assistant);
        totalToken += assistant.content.length;

        if (totalToken >= MAX_TOKEN) {
          resultArray.pop();
          break;
        }

        resultArray.push(message);
        totalToken += message.content.length;

        if (totalToken >= MAX_TOKEN) {
          resultArray.pop();
          break;
        }

        assistant = null;
      } else if (message.role === 'user' && assistant === null) {
        resultArray.push(message);
        totalToken += message.content.length;

        if (totalToken > MAX_TOKEN) {
          resultArray.pop();
          break;
        }
      } else {
        assistant = message;
      }
    }

    return resultArray.reverse();
  }
}

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';
export type MessageDocument = Message & Document;
@Schema({ timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }, discriminatorKey: 'type' })
export class Message {
  @Prop({
    required: false,
    type: String,
  })
  model: string;

  @Prop({
    type: String,
  })
  role: string;

  @Prop({
    type: String,
    required: false,
    default: 'Message',
  })
  type: string;

  @Prop({
    type: String,
  })
  content: string;

  @Prop({
    type: String,
    default: '1.0.0',
  })
  version: string;
}
export const MessageSchema = SchemaFactory.createForClass(Message);

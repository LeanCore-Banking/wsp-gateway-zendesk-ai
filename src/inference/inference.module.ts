import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GeminiService } from './gemini/gemini.service';
import { ClassifierService } from './classifier/classifier.service';

@Module({
  imports: [ConfigModule],
  providers: [GeminiService, ClassifierService],
  exports: [GeminiService, ClassifierService],
})
export class InferenceModule {}

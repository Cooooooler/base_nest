import { OpenAiStrategy } from './openai.strategy';

export class OpenAiCompatibleStrategy extends OpenAiStrategy {
  constructor(apiKey: string, baseUrl: string) {
    super(apiKey, baseUrl);
  }
}

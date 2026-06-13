import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Knowledge - Documents')
@Controller('knowledge/:knowledgeBaseId/documents')
export class DocumentController {}

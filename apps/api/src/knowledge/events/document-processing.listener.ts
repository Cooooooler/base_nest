import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DocumentService } from '../document.service';
import * as documentUploadedEvent from './document-uploaded.event';

@Injectable()
export class DocumentProcessingListener {
  private readonly logger = new Logger(DocumentProcessingListener.name);

  constructor(private readonly documentService: DocumentService) {}

  @OnEvent(documentUploadedEvent.DOCUMENT_UPLOADED)
  async handleDocumentUploaded(event: documentUploadedEvent.DocumentUploadedEvent): Promise<void> {
    const { documentId } = event;
    this.logger.log(`Processing uploaded document: ${documentId}`);
    try {
      await this.documentService.processDocument(documentId);
    } catch (err) {
      this.logger.error(
        `Document processing failed for ${documentId}: ${(err as Error).message}`,
        (err as Error).stack
      );
    }
  }
}

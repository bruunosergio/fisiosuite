import { Injectable, Logger } from '@nestjs/common';
import type {
  WhatsAppGateway,
  WhatsAppMessage,
  WhatsAppSendResult,
} from '../../domain/ports/output';

/**
 * Stub de desenvolvimento — registra no log.
 * Trocar por Evolution API / Meta Cloud / Twilio implementando a mesma porta.
 */
@Injectable()
export class StubWhatsAppGateway implements WhatsAppGateway {
  private readonly logger = new Logger(StubWhatsAppGateway.name);

  async send(message: WhatsAppMessage): Promise<WhatsAppSendResult> {
    const providerMessageId = `stub-${Date.now()}`;
    this.logger.log(
      `[WhatsApp stub] to=${message.to} appointment=${message.appointmentId ?? '-'} body=${message.body}`,
    );
    return { providerMessageId, accepted: true };
  }
}

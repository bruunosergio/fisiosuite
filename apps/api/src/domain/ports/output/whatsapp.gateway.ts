export type WhatsAppMessage = {
  to: string;
  body: string;
  appointmentId?: string;
};

export type WhatsAppSendResult = {
  providerMessageId: string;
  accepted: boolean;
};

/**
 * Porta de saída — implementação stub no MVP; trocar por Evolution/Twilio/Meta depois.
 */
export interface WhatsAppGateway {
  send(message: WhatsAppMessage): Promise<WhatsAppSendResult>;
}

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { createHmac } from 'crypto';
import { StoresService } from '../../stores/stores.service';

@Injectable()
export class WooCommerceSignatureGuard implements CanActivate {
  private readonly logger = new Logger(WooCommerceSignatureGuard.name);

  constructor(private readonly storesService: StoresService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const storeId = request.params.storeId;
    const signature = request.headers['x-wc-webhook-signature'];
    const rawBody = request.rawBody;

    // Get store data
    const storeData = await this.storesService.getStoreCredentials(storeId);
    if (!storeData) {
      this.logger.warn(`Store not found: ${storeId}`);
      throw new UnauthorizedException('Store not found');
    }

    // Get webhook secret from store credentials or dedicated field
    const webhookSecret = storeData.webhookSecret || storeData.credentials?.webhookSecret;

    // If no webhook secret configured, allow through (for testing)
    if (!webhookSecret) {
      this.logger.warn(`No webhook secret configured for store ${storeId}, allowing request`);
      return true;
    }

    // If signature header missing but we have a secret, reject
    if (!signature) {
      this.logger.warn(`Missing signature for store ${storeId}`);
      throw new UnauthorizedException('Missing webhook signature');
    }

    // Verify HMAC-SHA256 signature
    if (!rawBody) {
      this.logger.warn(`No raw body available for signature verification`);
      throw new UnauthorizedException('Cannot verify signature - no raw body');
    }

    const expectedSignature = createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('base64');

    if (signature !== expectedSignature) {
      this.logger.warn(`Invalid signature for store ${storeId}`);
      this.logger.debug(`Expected: ${expectedSignature.substring(0, 20)}...`);
      this.logger.debug(`Received: ${signature.substring(0, 20)}...`);
      throw new UnauthorizedException('Invalid webhook signature');
    }

    this.logger.log(`Webhook signature verified for store ${storeId}`);
    return true;
  }
}

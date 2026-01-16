/**
 * Order Processing Email Template
 * Sent when order is being processed/prepared
 */

import {
  baseTemplate,
  buttonComponent,
  dividerComponent,
  infoBoxComponent,
} from './base.template';

export interface OrderProcessingData {
  customerName: string;
  orderNumber: string;
  itemCount: number;
  orderUrl?: string;
  estimatedShipDate?: string;
}

export const orderProcessingTemplate = (data: OrderProcessingData): string => {
  const {
    customerName,
    orderNumber,
    itemCount,
    orderUrl = '#',
    estimatedShipDate,
  } = data;

  const content = `
    <!-- Processing Animation Icon -->
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td align="center" style="padding-bottom: 24px;">
          <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
            <span style="font-size: 40px; line-height: 80px;">📦</span>
          </div>
        </td>
      </tr>
    </table>

    <!-- Header -->
    <h1 style="margin: 0 0 8px; font-size: 28px; font-weight: 700; color: #1f2937; text-align: center;">
      We're Working on Your Order!
    </h1>
    <p style="margin: 0 0 24px; font-size: 16px; color: #6b7280; text-align: center; line-height: 1.6;">
      Hi ${customerName}, great news! Your order is now being prepared for shipment.
    </p>

    <!-- Order Info Box -->
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; margin-bottom: 24px;">
      <tr>
        <td style="padding: 24px; text-align: center;">
          <p style="margin: 0 0 4px; font-size: 13px; color: #92400e; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Order Number</p>
          <p style="margin: 0 0 16px; font-size: 24px; font-weight: 700; color: #78350f;">#${orderNumber}</p>
          <div style="display: inline-block; background-color: #ffffff; padding: 8px 16px; border-radius: 20px;">
            <span style="color: #d97706; font-size: 14px; font-weight: 600;">
              ⏳ Processing ${itemCount} item${itemCount > 1 ? 's' : ''}
            </span>
          </div>
        </td>
      </tr>
    </table>

    ${estimatedShipDate ? `
    ${infoBoxComponent('Estimated Ship Date', estimatedShipDate, '🚚')}
    ` : ''}

    ${dividerComponent()}

    <!-- Progress Steps -->
    <h2 style="margin: 0 0 20px; font-size: 18px; font-weight: 600; color: #1f2937;">
      Order Progress
    </h2>
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <!-- Step 1: Order Placed - Complete -->
      <tr>
        <td style="padding: 12px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <td width="40">
                <div style="width: 32px; height: 32px; background-color: #10b981; border-radius: 50%; text-align: center; line-height: 32px;">
                  <span style="color: white; font-size: 16px;">✓</span>
                </div>
              </td>
              <td style="padding-left: 12px;">
                <p style="margin: 0; font-size: 15px; font-weight: 600; color: #10b981;">Order Placed</p>
                <p style="margin: 4px 0 0; font-size: 13px; color: #6b7280;">Your order has been received</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <!-- Connector Line -->
      <tr>
        <td style="padding-left: 15px;">
          <div style="width: 2px; height: 24px; background-color: #10b981;"></div>
        </td>
      </tr>
      <!-- Step 2: Processing - Current -->
      <tr>
        <td style="padding: 12px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <td width="40">
                <div style="width: 32px; height: 32px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-radius: 50%; text-align: center; line-height: 32px; box-shadow: 0 0 0 4px #fef3c7;">
                  <span style="color: white; font-size: 14px;">●</span>
                </div>
              </td>
              <td style="padding-left: 12px;">
                <p style="margin: 0; font-size: 15px; font-weight: 600; color: #d97706;">Processing</p>
                <p style="margin: 4px 0 0; font-size: 13px; color: #6b7280;">Your items are being prepared</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <!-- Connector Line -->
      <tr>
        <td style="padding-left: 15px;">
          <div style="width: 2px; height: 24px; background-color: #e5e7eb;"></div>
        </td>
      </tr>
      <!-- Step 3: Shipped - Pending -->
      <tr>
        <td style="padding: 12px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <td width="40">
                <div style="width: 32px; height: 32px; background-color: #e5e7eb; border-radius: 50%; text-align: center; line-height: 32px;">
                  <span style="color: #9ca3af; font-size: 14px;">○</span>
                </div>
              </td>
              <td style="padding-left: 12px;">
                <p style="margin: 0; font-size: 15px; font-weight: 500; color: #9ca3af;">Shipped</p>
                <p style="margin: 4px 0 0; font-size: 13px; color: #9ca3af;">On its way to you</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <!-- Connector Line -->
      <tr>
        <td style="padding-left: 15px;">
          <div style="width: 2px; height: 24px; background-color: #e5e7eb;"></div>
        </td>
      </tr>
      <!-- Step 4: Delivered - Pending -->
      <tr>
        <td style="padding: 12px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <td width="40">
                <div style="width: 32px; height: 32px; background-color: #e5e7eb; border-radius: 50%; text-align: center; line-height: 32px;">
                  <span style="color: #9ca3af; font-size: 14px;">○</span>
                </div>
              </td>
              <td style="padding-left: 12px;">
                <p style="margin: 0; font-size: 15px; font-weight: 500; color: #9ca3af;">Delivered</p>
                <p style="margin: 4px 0 0; font-size: 13px; color: #9ca3af;">Package arrives at your door</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    ${buttonComponent('Track Your Order', orderUrl, '#f59e0b')}

    <!-- Info Box -->
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #f0fdf4; border-radius: 12px; border: 1px solid #bbf7d0; margin-top: 24px;">
      <tr>
        <td style="padding: 20px;">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <td width="40" style="vertical-align: top;">
                <span style="font-size: 24px;">💡</span>
              </td>
              <td style="padding-left: 12px;">
                <p style="margin: 0 0 8px; font-size: 15px; font-weight: 600; color: #166534;">What to expect next</p>
                <p style="margin: 0; font-size: 14px; color: #15803d; line-height: 1.6;">
                  You'll receive another email with your tracking number once your order ships. This usually happens within 1-3 business days.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;

  return baseTemplate({
    previewText: `Great news! Your order #${orderNumber} is being prepared for shipment.`,
    content,
    footerText: "We're working hard to get your order to you as quickly as possible!",
  });
};

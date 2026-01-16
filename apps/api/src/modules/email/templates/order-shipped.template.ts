/**
 * Order Shipped Email Template
 * Sent when order is shipped with tracking information
 */

import {
  baseTemplate,
  buttonComponent,
  dividerComponent,
  orderItemComponent,
  infoBoxComponent,
} from './base.template';

export interface OrderShippedData {
  customerName: string;
  orderNumber: string;
  trackingNumber: string;
  carrier: string;
  trackingUrl: string;
  estimatedDelivery?: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    image?: string;
  }>;
  shippingAddress: {
    name: string;
    address1: string;
    address2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  orderUrl?: string;
}

export const orderShippedTemplate = (data: OrderShippedData): string => {
  const {
    customerName,
    orderNumber,
    trackingNumber,
    carrier,
    trackingUrl,
    estimatedDelivery,
    items,
    shippingAddress,
    orderUrl = '#',
  } = data;

  const content = `
    <!-- Shipped Icon -->
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td align="center" style="padding-bottom: 24px;">
          <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
            <span style="font-size: 40px; line-height: 80px;">🚚</span>
          </div>
        </td>
      </tr>
    </table>

    <!-- Header -->
    <h1 style="margin: 0 0 8px; font-size: 28px; font-weight: 700; color: #1f2937; text-align: center;">
      Your Order is On Its Way!
    </h1>
    <p style="margin: 0 0 24px; font-size: 16px; color: #6b7280; text-align: center; line-height: 1.6;">
      Hi ${customerName}, exciting news! Your order has been shipped and is heading your way.
    </p>

    <!-- Tracking Info Card -->
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); border-radius: 12px; margin-bottom: 24px;">
      <tr>
        <td style="padding: 24px;">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <td align="center">
                <p style="margin: 0 0 8px; font-size: 13px; color: #1e40af; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Tracking Number</p>
                <p style="margin: 0 0 16px; font-size: 22px; font-weight: 700; color: #1e3a8a; font-family: monospace; letter-spacing: 1px;">${trackingNumber}</p>
                <p style="margin: 0 0 4px; font-size: 14px; color: #3b82f6;">
                  <strong>Carrier:</strong> ${carrier}
                </p>
                ${estimatedDelivery ? `
                <p style="margin: 8px 0 0; font-size: 14px; color: #3b82f6;">
                  <strong>Expected:</strong> ${estimatedDelivery}
                </p>
                ` : ''}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Track Button -->
    ${buttonComponent('Track Your Package', trackingUrl, '#3b82f6')}

    <!-- Alternative Tracking Links -->
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom: 24px;">
      <tr>
        <td align="center">
          <p style="margin: 0; font-size: 13px; color: #6b7280;">
            Or track on:
            <a href="https://t.17track.net/en#nums=${trackingNumber}" style="color: #3b82f6; text-decoration: underline;">17Track</a> |
            <a href="https://parcelsapp.com/en/tracking/${trackingNumber}" style="color: #3b82f6; text-decoration: underline;">Parcels</a>
          </p>
        </td>
      </tr>
    </table>

    ${dividerComponent()}

    <!-- Progress Steps -->
    <h2 style="margin: 0 0 20px; font-size: 18px; font-weight: 600; color: #1f2937;">
      Shipping Progress
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
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr><td style="padding-left: 15px;"><div style="width: 2px; height: 16px; background-color: #10b981;"></div></td></tr>
      <!-- Step 2: Processing - Complete -->
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
                <p style="margin: 0; font-size: 15px; font-weight: 600; color: #10b981;">Processing</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr><td style="padding-left: 15px;"><div style="width: 2px; height: 16px; background-color: #10b981;"></div></td></tr>
      <!-- Step 3: Shipped - Current -->
      <tr>
        <td style="padding: 12px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <td width="40">
                <div style="width: 32px; height: 32px; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); border-radius: 50%; text-align: center; line-height: 32px; box-shadow: 0 0 0 4px #dbeafe;">
                  <span style="color: white; font-size: 14px;">●</span>
                </div>
              </td>
              <td style="padding-left: 12px;">
                <p style="margin: 0; font-size: 15px; font-weight: 600; color: #3b82f6;">Shipped</p>
                <p style="margin: 4px 0 0; font-size: 13px; color: #6b7280;">Package is on the way</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr><td style="padding-left: 15px;"><div style="width: 2px; height: 16px; background-color: #e5e7eb;"></div></td></tr>
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
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    ${dividerComponent()}

    <!-- Items Being Shipped -->
    <h2 style="margin: 0 0 16px; font-size: 18px; font-weight: 600; color: #1f2937;">
      Items in This Shipment
    </h2>
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      ${items.map(item => orderItemComponent(item)).join('')}
    </table>

    ${dividerComponent()}

    <!-- Shipping Address -->
    <h2 style="margin: 0 0 16px; font-size: 18px; font-weight: 600; color: #1f2937;">
      Delivering To
    </h2>
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #f8fafc; border-radius: 8px;">
      <tr>
        <td style="padding: 16px;">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <td width="40" style="vertical-align: top;">
                <span style="font-size: 24px;">📍</span>
              </td>
              <td style="padding-left: 12px;">
                <p style="margin: 0 0 4px; font-size: 15px; font-weight: 600; color: #1f2937;">${shippingAddress.name}</p>
                <p style="margin: 0; font-size: 14px; color: #6b7280; line-height: 1.6;">
                  ${shippingAddress.address1}<br>
                  ${shippingAddress.address2 ? `${shippingAddress.address2}<br>` : ''}
                  ${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.postalCode}<br>
                  ${shippingAddress.country}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Order Number Reference -->
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-top: 24px;">
      <tr>
        <td align="center">
          <p style="margin: 0; font-size: 13px; color: #9ca3af;">
            Order #${orderNumber} | <a href="${orderUrl}" style="color: #3b82f6;">View Order Details</a>
          </p>
        </td>
      </tr>
    </table>
  `;

  return baseTemplate({
    previewText: `Your order #${orderNumber} has shipped! Track it with ${trackingNumber}`,
    content,
    footerText: "Your package is on its way! We hope you love your order.",
  });
};

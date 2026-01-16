/**
 * Order Received Email Template
 * Sent when a new order is placed
 */

import {
  baseTemplate,
  buttonComponent,
  dividerComponent,
  orderItemComponent,
  infoBoxComponent,
} from './base.template';

export interface OrderReceivedData {
  customerName: string;
  orderNumber: string;
  orderDate: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    image?: string;
  }>;
  subtotal: number;
  shipping: number;
  tax?: number;
  total: number;
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
  estimatedDelivery?: string;
}

export const orderReceivedTemplate = (data: OrderReceivedData): string => {
  const {
    customerName,
    orderNumber,
    orderDate,
    items,
    subtotal,
    shipping,
    tax = 0,
    total,
    shippingAddress,
    orderUrl = '#',
    estimatedDelivery,
  } = data;

  const content = `
    <!-- Success Icon -->
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td align="center" style="padding-bottom: 24px;">
          <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
            <span style="font-size: 40px; line-height: 80px;">✓</span>
          </div>
        </td>
      </tr>
    </table>

    <!-- Header -->
    <h1 style="margin: 0 0 8px; font-size: 28px; font-weight: 700; color: #1f2937; text-align: center;">
      Thank You for Your Order!
    </h1>
    <p style="margin: 0 0 24px; font-size: 16px; color: #6b7280; text-align: center; line-height: 1.6;">
      Hi ${customerName}, we've received your order and are getting it ready.
    </p>

    <!-- Order Info -->
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #f8fafc; border-radius: 12px; margin-bottom: 24px;">
      <tr>
        <td style="padding: 20px;">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <td width="50%">
                <p style="margin: 0 0 4px; font-size: 13px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Order Number</p>
                <p style="margin: 0; font-size: 18px; font-weight: 700; color: #667eea;">#${orderNumber}</p>
              </td>
              <td width="50%" style="text-align: right;">
                <p style="margin: 0 0 4px; font-size: 13px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Order Date</p>
                <p style="margin: 0; font-size: 16px; font-weight: 500; color: #1f2937;">${orderDate}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    ${estimatedDelivery ? `
    ${infoBoxComponent('Estimated Delivery', estimatedDelivery, '📅')}
    ` : ''}

    ${dividerComponent()}

    <!-- Order Items -->
    <h2 style="margin: 0 0 16px; font-size: 18px; font-weight: 600; color: #1f2937;">
      Order Summary
    </h2>
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      ${items.map(item => orderItemComponent(item)).join('')}
    </table>

    <!-- Order Totals -->
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-top: 24px;">
      <tr>
        <td style="padding: 8px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <td style="color: #6b7280; font-size: 15px;">Subtotal</td>
              <td style="text-align: right; color: #1f2937; font-size: 15px;">$${subtotal.toFixed(2)}</td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding: 8px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <td style="color: #6b7280; font-size: 15px;">Shipping</td>
              <td style="text-align: right; color: #1f2937; font-size: 15px;">${shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`}</td>
            </tr>
          </table>
        </td>
      </tr>
      ${tax > 0 ? `
      <tr>
        <td style="padding: 8px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <td style="color: #6b7280; font-size: 15px;">Tax</td>
              <td style="text-align: right; color: #1f2937; font-size: 15px;">$${tax.toFixed(2)}</td>
            </tr>
          </table>
        </td>
      </tr>
      ` : ''}
      <tr>
        <td style="padding: 16px 0 0; border-top: 2px solid #e5e7eb;">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <td style="color: #1f2937; font-size: 18px; font-weight: 700;">Total</td>
              <td style="text-align: right; color: #1f2937; font-size: 18px; font-weight: 700;">$${total.toFixed(2)}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    ${dividerComponent()}

    <!-- Shipping Address -->
    <h2 style="margin: 0 0 16px; font-size: 18px; font-weight: 600; color: #1f2937;">
      Shipping Address
    </h2>
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #f8fafc; border-radius: 8px;">
      <tr>
        <td style="padding: 16px;">
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

    ${buttonComponent('View Order Details', orderUrl, '#667eea')}

    <!-- What's Next -->
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background: linear-gradient(135deg, #667eea10 0%, #764ba210 100%); border-radius: 12px; margin-top: 24px;">
      <tr>
        <td style="padding: 24px;">
          <h3 style="margin: 0 0 12px; font-size: 16px; font-weight: 600; color: #1f2937;">What happens next?</h3>
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <td style="padding: 8px 0;">
                <table cellpadding="0" cellspacing="0" role="presentation">
                  <tr>
                    <td width="32" style="vertical-align: top;">
                      <span style="display: inline-block; width: 24px; height: 24px; background-color: #667eea; color: white; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; font-weight: 600;">1</span>
                    </td>
                    <td style="padding-left: 12px;">
                      <p style="margin: 0; font-size: 14px; color: #4b5563;">We'll process your order within 24 hours</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0;">
                <table cellpadding="0" cellspacing="0" role="presentation">
                  <tr>
                    <td width="32" style="vertical-align: top;">
                      <span style="display: inline-block; width: 24px; height: 24px; background-color: #667eea; color: white; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; font-weight: 600;">2</span>
                    </td>
                    <td style="padding-left: 12px;">
                      <p style="margin: 0; font-size: 14px; color: #4b5563;">You'll receive a shipping confirmation with tracking</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0;">
                <table cellpadding="0" cellspacing="0" role="presentation">
                  <tr>
                    <td width="32" style="vertical-align: top;">
                      <span style="display: inline-block; width: 24px; height: 24px; background-color: #667eea; color: white; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; font-weight: 600;">3</span>
                    </td>
                    <td style="padding-left: 12px;">
                      <p style="margin: 0; font-size: 14px; color: #4b5563;">Your order will arrive at your doorstep!</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;

  return baseTemplate({
    previewText: `Thank you for your order #${orderNumber}! We're getting it ready for you.`,
    content,
    footerText: "Thank you for shopping with us! We appreciate your business.",
  });
};

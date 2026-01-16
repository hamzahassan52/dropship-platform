/**
 * Order Delivered Email Template
 * Sent when order is delivered - includes review request
 */

import {
  baseTemplate,
  buttonComponent,
  dividerComponent,
  orderItemComponent,
} from './base.template';

export interface OrderDeliveredData {
  customerName: string;
  orderNumber: string;
  deliveryDate: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    image?: string;
    reviewUrl?: string;
  }>;
  reviewUrl?: string;
  shopAgainUrl?: string;
  supportUrl?: string;
}

export const orderDeliveredTemplate = (data: OrderDeliveredData): string => {
  const {
    customerName,
    orderNumber,
    deliveryDate,
    items,
    reviewUrl = '#',
    shopAgainUrl = '#',
    supportUrl = '#',
  } = data;

  const content = `
    <!-- Delivered Icon with Celebration -->
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td align="center" style="padding-bottom: 24px;">
          <div style="position: relative; display: inline-block;">
            <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
              <span style="font-size: 40px; line-height: 80px;">🎉</span>
            </div>
          </div>
        </td>
      </tr>
    </table>

    <!-- Header -->
    <h1 style="margin: 0 0 8px; font-size: 28px; font-weight: 700; color: #1f2937; text-align: center;">
      Your Order Has Arrived!
    </h1>
    <p style="margin: 0 0 24px; font-size: 16px; color: #6b7280; text-align: center; line-height: 1.6;">
      Hi ${customerName}, great news! Your order has been delivered. We hope you love it!
    </p>

    <!-- Delivery Confirmation Card -->
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); border-radius: 12px; margin-bottom: 24px;">
      <tr>
        <td style="padding: 24px; text-align: center;">
          <div style="display: inline-block; background-color: #ffffff; padding: 12px 24px; border-radius: 8px; margin-bottom: 16px;">
            <span style="color: #10b981; font-size: 16px; font-weight: 600;">✓ Delivered</span>
          </div>
          <p style="margin: 0 0 4px; font-size: 13px; color: #047857; text-transform: uppercase; letter-spacing: 0.5px;">Order #${orderNumber}</p>
          <p style="margin: 0; font-size: 16px; color: #065f46; font-weight: 500;">Delivered on ${deliveryDate}</p>
        </td>
      </tr>
    </table>

    ${dividerComponent()}

    <!-- Items Delivered -->
    <h2 style="margin: 0 0 16px; font-size: 18px; font-weight: 600; color: #1f2937;">
      What's in Your Package
    </h2>
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      ${items.map(item => orderItemComponent(item)).join('')}
    </table>

    ${dividerComponent()}

    <!-- Review Request Section -->
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; margin: 24px 0;">
      <tr>
        <td style="padding: 32px; text-align: center;">
          <span style="font-size: 48px; display: block; margin-bottom: 16px;">⭐</span>
          <h3 style="margin: 0 0 8px; font-size: 20px; font-weight: 700; color: #78350f;">
            How Did We Do?
          </h3>
          <p style="margin: 0 0 20px; font-size: 15px; color: #92400e; line-height: 1.6;">
            Your feedback helps us improve and helps other shoppers make great choices. It only takes a minute!
          </p>
          <a href="${reviewUrl}" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px; box-shadow: 0 4px 14px rgba(245, 158, 11, 0.4);">
            ⭐ Leave a Review
          </a>
        </td>
      </tr>
    </table>

    <!-- Star Rating Preview -->
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom: 24px;">
      <tr>
        <td align="center">
          <p style="margin: 0 0 12px; font-size: 14px; color: #6b7280;">Quick rate your experience:</p>
          <table cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <td style="padding: 0 4px;"><a href="${reviewUrl}?rating=1" style="text-decoration: none; font-size: 32px;">⭐</a></td>
              <td style="padding: 0 4px;"><a href="${reviewUrl}?rating=2" style="text-decoration: none; font-size: 32px;">⭐</a></td>
              <td style="padding: 0 4px;"><a href="${reviewUrl}?rating=3" style="text-decoration: none; font-size: 32px;">⭐</a></td>
              <td style="padding: 0 4px;"><a href="${reviewUrl}?rating=4" style="text-decoration: none; font-size: 32px;">⭐</a></td>
              <td style="padding: 0 4px;"><a href="${reviewUrl}?rating=5" style="text-decoration: none; font-size: 32px;">⭐</a></td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    ${dividerComponent()}

    <!-- Shop Again Section -->
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td style="text-align: center;">
          <h3 style="margin: 0 0 12px; font-size: 18px; font-weight: 600; color: #1f2937;">
            Ready for More?
          </h3>
          <p style="margin: 0 0 20px; font-size: 15px; color: #6b7280;">
            Check out our latest products and find something new you'll love.
          </p>
        </td>
      </tr>
    </table>
    ${buttonComponent('Shop Again', shopAgainUrl, '#667eea')}

    ${dividerComponent()}

    <!-- Help Section -->
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #f8fafc; border-radius: 12px;">
      <tr>
        <td style="padding: 24px;">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <td width="50%" style="vertical-align: top; padding-right: 12px;">
                <h4 style="margin: 0 0 8px; font-size: 15px; font-weight: 600; color: #1f2937;">
                  📦 Wrong item or damaged?
                </h4>
                <p style="margin: 0; font-size: 13px; color: #6b7280; line-height: 1.5;">
                  We're sorry! Contact us within 7 days for a quick resolution.
                </p>
              </td>
              <td width="50%" style="vertical-align: top; padding-left: 12px;">
                <h4 style="margin: 0 0 8px; font-size: 15px; font-weight: 600; color: #1f2937;">
                  🔄 Need to return?
                </h4>
                <p style="margin: 0; font-size: 13px; color: #6b7280; line-height: 1.5;">
                  Easy returns within 30 days. We've got you covered.
                </p>
              </td>
            </tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-top: 16px;">
            <tr>
              <td align="center">
                <a href="${supportUrl}" style="color: #667eea; font-size: 14px; font-weight: 500; text-decoration: none;">
                  Contact Support →
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Thank You Message -->
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-top: 24px;">
      <tr>
        <td align="center">
          <p style="margin: 0; font-size: 18px; color: #667eea; font-weight: 600;">
            Thank you for shopping with us! 💜
          </p>
        </td>
      </tr>
    </table>
  `;

  return baseTemplate({
    previewText: `Your order #${orderNumber} has been delivered! We'd love to hear what you think.`,
    content,
    footerText: "Thank you for being a valued customer. We appreciate your business!",
  });
};

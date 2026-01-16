/**
 * Welcome Email Template
 * Sent when a new user signs up
 */

import {
  baseTemplate,
  buttonComponent,
  dividerComponent,
} from './base.template';

export interface WelcomeEmailData {
  customerName: string;
  email: string;
  shopUrl?: string;
  featuredProducts?: Array<{
    name: string;
    price: number;
    image?: string;
    url: string;
  }>;
  discountCode?: string;
  discountPercent?: number;
}

export const welcomeTemplate = (data: WelcomeEmailData): string => {
  const {
    customerName,
    shopUrl = '#',
    featuredProducts = [],
    discountCode,
    discountPercent = 10,
  } = data;

  const content = `
    <!-- Welcome Icon -->
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td align="center" style="padding-bottom: 24px;">
          <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
            <span style="font-size: 40px; line-height: 80px;">👋</span>
          </div>
        </td>
      </tr>
    </table>

    <!-- Header -->
    <h1 style="margin: 0 0 8px; font-size: 28px; font-weight: 700; color: #1f2937; text-align: center;">
      Welcome to the Family!
    </h1>
    <p style="margin: 0 0 24px; font-size: 16px; color: #6b7280; text-align: center; line-height: 1.6;">
      Hi ${customerName}, we're thrilled to have you join us! Get ready to discover amazing products at unbeatable prices.
    </p>

    ${discountCode ? `
    <!-- Discount Code Card -->
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 16px; margin-bottom: 24px;">
      <tr>
        <td style="padding: 32px; text-align: center;">
          <p style="margin: 0 0 8px; font-size: 14px; color: rgba(255,255,255,0.9); text-transform: uppercase; letter-spacing: 1px;">
            🎁 Welcome Gift Just for You
          </p>
          <h2 style="margin: 0 0 16px; font-size: 36px; font-weight: 800; color: #ffffff;">
            ${discountPercent}% OFF
          </h2>
          <p style="margin: 0 0 16px; font-size: 15px; color: rgba(255,255,255,0.9);">
            Use code on your first order:
          </p>
          <div style="display: inline-block; background-color: rgba(255,255,255,0.2); border: 2px dashed rgba(255,255,255,0.5); padding: 12px 24px; border-radius: 8px;">
            <span style="font-size: 24px; font-weight: 700; color: #ffffff; font-family: monospace; letter-spacing: 2px;">${discountCode}</span>
          </div>
          <p style="margin: 16px 0 0; font-size: 12px; color: rgba(255,255,255,0.7);">
            Valid for 30 days. One-time use only.
          </p>
        </td>
      </tr>
    </table>
    ` : ''}

    <!-- Start Shopping Button -->
    ${buttonComponent('Start Shopping', shopUrl, '#667eea')}

    ${dividerComponent()}

    <!-- What You Can Do Section -->
    <h2 style="margin: 0 0 20px; font-size: 20px; font-weight: 600; color: #1f2937; text-align: center;">
      Here's What You Can Do
    </h2>
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <!-- Feature 1 -->
      <tr>
        <td style="padding: 16px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #f8fafc; border-radius: 12px;">
            <tr>
              <td style="padding: 20px;">
                <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                  <tr>
                    <td width="50" style="vertical-align: top;">
                      <div style="width: 44px; height: 44px; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 10px; text-align: center; line-height: 44px;">
                        <span style="font-size: 22px;">🛍️</span>
                      </div>
                    </td>
                    <td style="padding-left: 16px; vertical-align: top;">
                      <h3 style="margin: 0 0 4px; font-size: 16px; font-weight: 600; color: #1f2937;">Browse Trending Products</h3>
                      <p style="margin: 0; font-size: 14px; color: #6b7280; line-height: 1.5;">Discover our curated collection of must-have items at incredible prices.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <!-- Feature 2 -->
      <tr>
        <td style="padding: 16px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #f8fafc; border-radius: 12px;">
            <tr>
              <td style="padding: 20px;">
                <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                  <tr>
                    <td width="50" style="vertical-align: top;">
                      <div style="width: 44px; height: 44px; background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); border-radius: 10px; text-align: center; line-height: 44px;">
                        <span style="font-size: 22px;">🚚</span>
                      </div>
                    </td>
                    <td style="padding-left: 16px; vertical-align: top;">
                      <h3 style="margin: 0 0 4px; font-size: 16px; font-weight: 600; color: #1f2937;">Fast & Free Shipping</h3>
                      <p style="margin: 0; font-size: 14px; color: #6b7280; line-height: 1.5;">Enjoy free shipping on orders over $30. Track your packages in real-time.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <!-- Feature 3 -->
      <tr>
        <td style="padding: 16px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #f8fafc; border-radius: 12px;">
            <tr>
              <td style="padding: 20px;">
                <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                  <tr>
                    <td width="50" style="vertical-align: top;">
                      <div style="width: 44px; height: 44px; background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); border-radius: 10px; text-align: center; line-height: 44px;">
                        <span style="font-size: 22px;">🔒</span>
                      </div>
                    </td>
                    <td style="padding-left: 16px; vertical-align: top;">
                      <h3 style="margin: 0 0 4px; font-size: 16px; font-weight: 600; color: #1f2937;">Secure Checkout</h3>
                      <p style="margin: 0; font-size: 14px; color: #6b7280; line-height: 1.5;">Shop with confidence using our 256-bit encrypted secure payment system.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <!-- Feature 4 -->
      <tr>
        <td style="padding: 16px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #f8fafc; border-radius: 12px;">
            <tr>
              <td style="padding: 20px;">
                <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                  <tr>
                    <td width="50" style="vertical-align: top;">
                      <div style="width: 44px; height: 44px; background: linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%); border-radius: 10px; text-align: center; line-height: 44px;">
                        <span style="font-size: 22px;">💬</span>
                      </div>
                    </td>
                    <td style="padding-left: 16px; vertical-align: top;">
                      <h3 style="margin: 0 0 4px; font-size: 16px; font-weight: 600; color: #1f2937;">24/7 Support</h3>
                      <p style="margin: 0; font-size: 14px; color: #6b7280; line-height: 1.5;">Our friendly support team is always here to help with any questions.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    ${featuredProducts.length > 0 ? `
    ${dividerComponent()}

    <!-- Featured Products -->
    <h2 style="margin: 0 0 20px; font-size: 20px; font-weight: 600; color: #1f2937; text-align: center;">
      Popular Right Now
    </h2>
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        ${featuredProducts.slice(0, 3).map(product => `
        <td width="33%" style="padding: 8px; vertical-align: top;">
          <a href="${product.url}" style="text-decoration: none; display: block;">
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #f8fafc; border-radius: 12px;">
              <tr>
                <td style="padding: 12px; text-align: center;">
                  ${product.image ? `
                  <img src="${product.image}" alt="${product.name}" width="100" height="100" style="width: 100px; height: 100px; object-fit: cover; border-radius: 8px; margin-bottom: 8px;">
                  ` : `
                  <div style="width: 100px; height: 100px; background-color: #e5e7eb; border-radius: 8px; margin: 0 auto 8px; line-height: 100px;">
                    <span style="font-size: 40px;">📦</span>
                  </div>
                  `}
                  <p style="margin: 0 0 4px; font-size: 13px; font-weight: 600; color: #1f2937; line-height: 1.3;">${product.name}</p>
                  <p style="margin: 0; font-size: 14px; font-weight: 700; color: #667eea;">$${product.price.toFixed(2)}</p>
                </td>
              </tr>
            </table>
          </a>
        </td>
        `).join('')}
      </tr>
    </table>
    ` : ''}

    ${dividerComponent()}

    <!-- Social Links -->
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="text-align: center;">
      <tr>
        <td>
          <p style="margin: 0 0 16px; font-size: 15px; color: #6b7280;">
            Follow us for exclusive deals & updates
          </p>
          <table cellpadding="0" cellspacing="0" role="presentation" style="margin: 0 auto;">
            <tr>
              <td style="padding: 0 8px;">
                <a href="#" style="display: inline-block; width: 40px; height: 40px; background-color: #f3f4f6; border-radius: 50%; text-align: center; line-height: 40px; text-decoration: none;">
                  <span style="font-size: 18px;">📘</span>
                </a>
              </td>
              <td style="padding: 0 8px;">
                <a href="#" style="display: inline-block; width: 40px; height: 40px; background-color: #f3f4f6; border-radius: 50%; text-align: center; line-height: 40px; text-decoration: none;">
                  <span style="font-size: 18px;">📸</span>
                </a>
              </td>
              <td style="padding: 0 8px;">
                <a href="#" style="display: inline-block; width: 40px; height: 40px; background-color: #f3f4f6; border-radius: 50%; text-align: center; line-height: 40px; text-decoration: none;">
                  <span style="font-size: 18px;">🐦</span>
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Welcome Message -->
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-top: 24px;">
      <tr>
        <td align="center">
          <p style="margin: 0; font-size: 18px; color: #667eea; font-weight: 600;">
            Welcome aboard! Happy shopping! 🎉
          </p>
        </td>
      </tr>
    </table>
  `;

  return baseTemplate({
    previewText: `Welcome to the family, ${customerName}! ${discountCode ? `Use code ${discountCode} for ${discountPercent}% off!` : 'Start shopping today!'}`,
    content,
    footerText: "We're so happy to have you! Let us know if you need anything.",
  });
};

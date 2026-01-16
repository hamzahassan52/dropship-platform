/**
 * Base Email Template - Professional responsive design
 * Works on Gmail, Outlook, Apple Mail, and mobile devices
 */

export interface BaseTemplateData {
  previewText?: string;
  content: string;
  footerText?: string;
  unsubscribeUrl?: string;
}

export const baseTemplate = (data: BaseTemplateData): string => {
  const { previewText = '', content, footerText = 'Thank you for shopping with us!', unsubscribeUrl } = data;

  return `
<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="x-apple-disable-message-reformatting">
  <meta http-equiv="x-ua-compatible" content="ie=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <title>Dropship Store</title>
  <style>
    /* Reset */
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }

    /* Base */
    body { margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #f4f4f7; }

    /* Links */
    a { color: #3869d4; text-decoration: none; }
    a:hover { text-decoration: underline; }

    /* Responsive */
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; padding: 0 !important; }
      .content { padding: 24px !important; }
      .button { width: 100% !important; }
      .product-image { width: 80px !important; height: 80px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; width: 100%; background-color: #f4f4f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">

  <!-- Preview Text -->
  <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">
    ${previewText}
    ${'&nbsp;'.repeat(100)}
  </div>

  <!-- Email Body -->
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #f4f4f7;">
    <tr>
      <td align="center" style="padding: 24px;">

        <!-- Email Container -->
        <table class="container" width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width: 600px; margin: 0 auto;">

          <!-- Header -->
          <tr>
            <td style="padding: 24px 0; text-align: center;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td style="text-align: center;">
                    <div style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 12px 24px; border-radius: 8px;">
                      <span style="color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">DropShip</span>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content Card -->
          <tr>
            <td>
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
                <tr>
                  <td class="content" style="padding: 40px;">
                    ${content}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 32px 24px; text-align: center;">
              <p style="margin: 0 0 16px; color: #6b7280; font-size: 14px; line-height: 1.5;">
                ${footerText}
              </p>
              <p style="margin: 0 0 16px; color: #9ca3af; font-size: 12px;">
                Questions? Reply to this email or contact our support team.
              </p>
              ${unsubscribeUrl ? `
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                <a href="${unsubscribeUrl}" style="color: #9ca3af;">Unsubscribe from emails</a>
              </p>
              ` : ''}
              <p style="margin: 16px 0 0; color: #d1d5db; font-size: 11px;">
                &copy; ${new Date().getFullYear()} DropShip Store. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
  `.trim();
};

// Reusable Components

export const buttonComponent = (text: string, url: string, color: string = '#667eea'): string => `
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin: 24px 0;">
  <tr>
    <td align="center">
      <a href="${url}" class="button" style="display: inline-block; background: linear-gradient(135deg, ${color} 0%, ${adjustColor(color, -20)} 100%); color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px; box-shadow: 0 4px 14px rgba(102, 126, 234, 0.4);">
        ${text}
      </a>
    </td>
  </tr>
</table>
`;

export const dividerComponent = (): string => `
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin: 24px 0;">
  <tr>
    <td style="border-top: 1px solid #e5e7eb;"></td>
  </tr>
</table>
`;

export const orderItemComponent = (item: {
  name: string;
  quantity: number;
  price: number;
  image?: string;
}): string => `
<tr>
  <td style="padding: 16px 0; border-bottom: 1px solid #f3f4f6;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td width="80" style="vertical-align: top;">
          ${item.image ? `
          <img class="product-image" src="${item.image}" alt="${item.name}" width="80" height="80" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px; border: 1px solid #e5e7eb;">
          ` : `
          <div style="width: 80px; height: 80px; background-color: #f3f4f6; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
            <span style="color: #9ca3af; font-size: 24px;">📦</span>
          </div>
          `}
        </td>
        <td style="vertical-align: top; padding-left: 16px;">
          <p style="margin: 0 0 4px; font-size: 15px; font-weight: 600; color: #1f2937;">${item.name}</p>
          <p style="margin: 0; font-size: 14px; color: #6b7280;">Qty: ${item.quantity}</p>
        </td>
        <td width="80" style="vertical-align: top; text-align: right;">
          <p style="margin: 0; font-size: 15px; font-weight: 600; color: #1f2937;">$${item.price.toFixed(2)}</p>
        </td>
      </tr>
    </table>
  </td>
</tr>
`;

export const infoBoxComponent = (title: string, content: string, icon: string = '📋'): string => `
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin: 16px 0;">
  <tr>
    <td style="background-color: #f8fafc; border-radius: 8px; padding: 16px;">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        <tr>
          <td width="40" style="vertical-align: top;">
            <span style="font-size: 24px;">${icon}</span>
          </td>
          <td style="vertical-align: top; padding-left: 12px;">
            <p style="margin: 0 0 4px; font-size: 13px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">${title}</p>
            <p style="margin: 0; font-size: 15px; color: #1f2937; font-weight: 500;">${content}</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
`;

export const statusBadgeComponent = (status: string, color: string): string => `
<span style="display: inline-block; background-color: ${color}20; color: ${color}; font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px;">
  ${status}
</span>
`;

// Helper function to darken/lighten colors
function adjustColor(color: string, amount: number): string {
  const hex = color.replace('#', '');
  const num = parseInt(hex, 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
  const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

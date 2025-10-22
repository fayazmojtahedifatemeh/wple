import nodemailer from 'nodemailer';
import type { WishlistItem } from '@shared/schema';

interface EmailConfig {
  host?: string;
  port?: number;
  secure?: boolean;
  user?: string;
  pass?: string;
  from?: string;
  enabled: boolean;
}

function getEmailConfig(): EmailConfig {
  const enabled = !!(process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS);
  
  return {
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true',
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    enabled,
  };
}

export async function sendPriceDropAlert(
  item: WishlistItem,
  oldPrice: number,
  newPrice: number,
  priceChangePercent: number
): Promise<boolean> {
  const config = getEmailConfig();
  
  if (!config.enabled) {
    console.log('[Email] Email notifications disabled - missing configuration');
    return false;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    });

    const subject = `🎉 Price Drop Alert: ${item.title}`;
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .price-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .old-price { text-decoration: line-through; color: #999; font-size: 18px; }
            .new-price { color: #10b981; font-size: 28px; font-weight: bold; }
            .savings { color: #10b981; font-size: 20px; font-weight: bold; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
            img { max-width: 100%; border-radius: 8px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">🎉 Price Drop Alert!</h1>
            </div>
            <div class="content">
              <h2>${item.title}</h2>
              ${item.brand ? `<p><strong>Brand:</strong> ${item.brand}</p>` : ''}
              
              ${item.images && item.images.length > 0 ? `<img src="${item.images[0]}" alt="${item.title}" />` : ''}
              
              <div class="price-box">
                <p class="old-price">Was: ${item.currency}${oldPrice.toFixed(2)}</p>
                <p class="new-price">Now: ${item.currency}${newPrice.toFixed(2)}</p>
                <p class="savings">Save ${Math.abs(priceChangePercent).toFixed(1)}%!</p>
              </div>
              
              <a href="${item.url}" class="button">View Product</a>
              
              <p style="margin-top: 30px; color: #666; font-size: 14px;">
                This price was detected by your automated wishlist tracker.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    await transporter.sendMail({
      from: config.from,
      to: process.env.NOTIFICATION_EMAIL || config.user,
      subject,
      html,
    });

    console.log(`[Email] Price drop notification sent for "${item.title}"`);
    return true;
  } catch (error) {
    console.error('[Email] Failed to send price drop notification:', error);
    return false;
  }
}

export async function sendRestockAlert(item: WishlistItem): Promise<boolean> {
  const config = getEmailConfig();
  
  if (!config.enabled) {
    console.log('[Email] Email notifications disabled - missing configuration');
    return false;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    });

    const subject = `🔔 Back in Stock: ${item.title}`;
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
            img { max-width: 100%; border-radius: 8px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">🔔 Item Back in Stock!</h1>
            </div>
            <div class="content">
              <h2>${item.title}</h2>
              ${item.brand ? `<p><strong>Brand:</strong> ${item.brand}</p>` : ''}
              
              ${item.images && item.images.length > 0 ? `<img src="${item.images[0]}" alt="${item.title}" />` : ''}
              
              <p style="font-size: 18px;">Good news! This item is now back in stock.</p>
              <p style="font-size: 24px; color: #667eea; font-weight: bold;">${item.currency}${String(item.price)}</p>
              
              <a href="${item.url}" class="button">Buy Now</a>
              
              <p style="margin-top: 30px; color: #666; font-size: 14px;">
                This restock was detected by your automated wishlist tracker.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    await transporter.sendMail({
      from: config.from,
      to: process.env.NOTIFICATION_EMAIL || config.user,
      subject,
      html,
    });

    console.log(`[Email] Restock notification sent for "${item.title}"`);
    return true;
  } catch (error) {
    console.error('[Email] Failed to send restock notification:', error);
    return false;
  }
}

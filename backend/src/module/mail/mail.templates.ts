import type { MailMessage } from './mail.types.js';

/** The values below come from customers and vendors (names, addresses, notes), so nothing goes into the HTML as it is. */
export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const money = new Intl.NumberFormat('vi-VN');
export const formatMoney = (value: number | string): string => `${money.format(Math.round(Number(value)))}đ`;

const dateTime = new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short' });
export const formatDateTime = (iso: string | Date): string => dateTime.format(new Date(iso));

const NAVY = '#0F3860';
const RED = '#E63946';
const HOTLINE = '1900 6868';
const SUPPORT_EMAIL = 'support@haisanexpress.vn';

interface Layout {
  /** The line mail programs show next to the subject. */
  preheader: string;
  title: string;
  /** HTML of the body; the caller escapes what it puts in. */
  body: string;
}

/** One frame for every mail: the brand bar, the content, and how to reach the shop. Tables and inline styles, as mail programs need. */
function layout({ preheader, title, body }: Layout): string {
  return `<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background:#EEF4FB;font-family:Arial,Helvetica,sans-serif;color:#1e293b;">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EEF4FB;padding:24px 12px;">
  <tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;">
      <tr><td style="background:${NAVY};padding:18px 24px;color:#ffffff;font-size:20px;font-weight:bold;">HaiSan<span style="color:#ff8a93;">Express</span></td></tr>
      <tr><td style="padding:28px 24px;font-size:15px;line-height:1.6;">
        <h1 style="margin:0 0 16px;font-size:20px;color:${NAVY};">${escapeHtml(title)}</h1>
        ${body}
      </td></tr>
      <tr><td style="padding:16px 24px;background:#f8fafc;color:#64748b;font-size:12px;line-height:1.5;">
        Cần hỗ trợ? Gọi <strong>${HOTLINE}</strong> hoặc gửi thư tới ${SUPPORT_EMAIL}.<br>
        Đây là thư tự động từ HaiSan Express, vui lòng không trả lời thư này.
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

function button(url: string, label: string): string {
  return `<p style="margin:24px 0;"><a href="${escapeHtml(url)}" style="display:inline-block;background:${RED};color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 24px;border-radius:8px;">${escapeHtml(label)}</a></p>`;
}

function link(url: string): string {
  return `<p style="margin:0;font-size:13px;color:#64748b;word-break:break-all;">Nếu nút không bấm được, hãy dán đường dẫn này vào trình duyệt:<br><a href="${escapeHtml(url)}" style="color:${NAVY};">${escapeHtml(url)}</a></p>`;
}

function mail(to: string, subject: string, text: string, html: string): MailMessage {
  return { to, subject, text, html };
}

// ----- password -----------------------------------------------------------------------------------------------

export function passwordResetMail(input: { to: string; name: string; url: string; minutes: number }): MailMessage {
  const { to, name, url, minutes } = input;
  const text = `Xin chào ${name},

Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản HaiSan Express của bạn.
Mở đường dẫn sau để chọn mật khẩu mới (có hiệu lực trong ${minutes} phút, chỉ dùng được một lần):

${url}

Nếu bạn không yêu cầu, hãy bỏ qua thư này: mật khẩu của bạn vẫn như cũ.`;
  const html = layout({
    preheader: `Đặt lại mật khẩu, đường dẫn có hiệu lực ${minutes} phút.`,
    title: 'Đặt lại mật khẩu',
    body: `<p>Xin chào <strong>${escapeHtml(name)}</strong>,</p>
<p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản HaiSan Express của bạn. Bấm nút bên dưới để chọn mật khẩu mới. Đường dẫn có hiệu lực trong <strong>${minutes} phút</strong> và chỉ dùng được một lần.</p>
${button(url, 'Đặt lại mật khẩu')}
${link(url)}
<p style="margin-top:20px;color:#64748b;">Nếu bạn không yêu cầu, hãy bỏ qua thư này: mật khẩu của bạn vẫn như cũ.</p>`,
  });
  return mail(to, 'Đặt lại mật khẩu HaiSan Express', text, html);
}

export function passwordChangedMail(input: { to: string; name: string; appUrl: string; at: Date }): MailMessage {
  const { to, name, appUrl, at } = input;
  const forgot = `${appUrl}/customer/forgot-password`;
  const when = formatDateTime(at);
  const text = `Xin chào ${name},

Mật khẩu tài khoản HaiSan Express của bạn vừa được thay đổi lúc ${when}. Các phiên đăng nhập cũ đã bị đăng xuất.

Nếu không phải bạn làm, hãy đặt lại mật khẩu ngay: ${forgot}
và gọi ${HOTLINE} để chúng tôi hỗ trợ.`;
  const html = layout({
    preheader: 'Mật khẩu của bạn vừa được thay đổi.',
    title: 'Mật khẩu đã được thay đổi',
    body: `<p>Xin chào <strong>${escapeHtml(name)}</strong>,</p>
<p>Mật khẩu tài khoản HaiSan Express của bạn vừa được thay đổi lúc <strong>${escapeHtml(when)}</strong>. Các phiên đăng nhập cũ đã bị đăng xuất.</p>
<p>Nếu không phải bạn làm, hãy đặt lại mật khẩu ngay và gọi <strong>${HOTLINE}</strong> để chúng tôi hỗ trợ.</p>
${button(forgot, 'Đặt lại mật khẩu')}`,
  });
  return mail(to, 'Mật khẩu của bạn đã được thay đổi', text, html);
}

export function googleLinkedMail(input: { to: string; name: string; appUrl: string }): MailMessage {
  const { to, name, appUrl } = input;
  const forgot = `${appUrl}/customer/forgot-password`;
  const text = `Xin chào ${name},

Tài khoản HaiSan Express của bạn vừa được liên kết với Google. Vì địa chỉ email này chưa từng được xác minh, mật khẩu cũ đã bị vô hiệu hóa và các phiên đăng nhập cũ đã bị đăng xuất.

Bạn vẫn đăng nhập bằng Google như bình thường. Nếu muốn dùng mật khẩu, hãy đặt mật khẩu mới: ${forgot}
Nếu không phải bạn làm, hãy gọi ${HOTLINE} để chúng tôi hỗ trợ.`;
  const html = layout({
    preheader: 'Tài khoản của bạn đã được liên kết với Google.',
    title: 'Đã liên kết với Google',
    body: `<p>Xin chào <strong>${escapeHtml(name)}</strong>,</p>
<p>Tài khoản HaiSan Express của bạn vừa được liên kết với Google. Vì địa chỉ email này chưa từng được xác minh, mật khẩu cũ đã bị vô hiệu hóa và các phiên đăng nhập cũ đã bị đăng xuất.</p>
<p>Bạn vẫn đăng nhập bằng Google như bình thường. Nếu muốn dùng mật khẩu, hãy đặt mật khẩu mới. Nếu không phải bạn làm, hãy gọi <strong>${HOTLINE}</strong>.</p>
${button(forgot, 'Đặt mật khẩu mới')}`,
  });
  return mail(to, 'Tài khoản của bạn đã liên kết với Google', text, html);
}

// ----- orders -------------------------------------------------------------------------------------------------

export interface OrderMailData {
  orderNumber: string;
  createdAt: string;
  subtotal: number | string;
  shippingTotal: number | string;
  grandTotal: number | string;
  /** COD, BANK_TRANSFER... ; null when the order has no payment. */
  paymentMethod: string | null;
  paymentStatus: string | null;
  recipient: { name: string; phone: string; address: string; ward: string | null; district: string; province: string };
  customerNote: string | null;
  parts: Array<{
    vendorName: string;
    shippingFee: number | string;
    items: Array<{ name: string; variant: string; quantity: number | string; unit: string; lineTotal: number | string }>;
  }>;
}

const PAYMENT_METHOD: Record<string, string> = {
  COD: 'Thanh toán khi nhận hàng',
  BANK_TRANSFER: 'Chuyển khoản QR',
  E_WALLET: 'Ví điện tử',
  CARD: 'Thẻ',
};

function addressLine(recipient: OrderMailData['recipient']): string {
  return [recipient.address, recipient.ward, recipient.district, recipient.province].filter(Boolean).join(', ');
}

const quantityText = (value: number | string): string => String(Number(value));

export function orderPlacedMail(input: { to: string; name: string; order: OrderMailData; appUrl: string }): MailMessage {
  const { to, name, order, appUrl } = input;
  const orderUrl = `${appUrl}/customer/orders/${encodeURIComponent(order.orderNumber)}`;
  const payUrl = `${appUrl}/customer/orders/${encodeURIComponent(order.orderNumber)}/payment`;
  const method = order.paymentMethod ? (PAYMENT_METHOD[order.paymentMethod] ?? order.paymentMethod) : '';
  // A QR payment that is not paid yet is the one thing the customer still has to do.
  const needsPayment = order.paymentMethod === 'BANK_TRANSFER' && order.paymentStatus !== 'PAID';

  const textParts = order.parts
    .map(
      (part) =>
        `${part.vendorName}\n${part.items.map((item) => `  - ${item.name} (${item.variant}) x ${quantityText(item.quantity)} ${item.unit}: ${formatMoney(item.lineTotal)}`).join('\n')}\n  Phí vận chuyển: ${formatMoney(part.shippingFee)}`,
    )
    .join('\n\n');
  const text = `Xin chào ${name},

Cảm ơn bạn đã đặt hàng tại HaiSan Express. Đơn hàng ${order.orderNumber} (${formatDateTime(order.createdAt)}) đã được ghi nhận và gửi tới các vựa.

${textParts}

Tạm tính: ${formatMoney(order.subtotal)}
Phí vận chuyển: ${formatMoney(order.shippingTotal)}
Tổng cộng: ${formatMoney(order.grandTotal)}
Thanh toán: ${method}

Giao tới: ${order.recipient.name}, ${order.recipient.phone}
${addressLine(order.recipient)}
${needsPayment ? `\nĐơn của bạn chưa thanh toán. Thanh toán bằng mã QR tại: ${payUrl}\n` : ''}
Theo dõi đơn hàng: ${orderUrl}`;

  const partsHtml = order.parts
    .map(
      (part) => `<p style="margin:16px 0 4px;font-weight:bold;color:${NAVY};">${escapeHtml(part.vendorName)}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
${part.items
  .map(
    (item) => `<tr><td style="padding:4px 0;">${escapeHtml(item.name)} <span style="color:#64748b;">(${escapeHtml(item.variant)})</span><br><span style="color:#64748b;">${escapeHtml(quantityText(item.quantity))} ${escapeHtml(item.unit)}</span></td><td align="right" style="padding:4px 0;white-space:nowrap;">${formatMoney(item.lineTotal)}</td></tr>`,
  )
  .join('\n')}
<tr><td style="padding:4px 0;color:#64748b;">Phí vận chuyển</td><td align="right" style="padding:4px 0;color:#64748b;">${formatMoney(part.shippingFee)}</td></tr>
</table>`,
    )
    .join('\n');

  const html = layout({
    preheader: `Đơn hàng ${order.orderNumber} đã được ghi nhận, tổng ${formatMoney(order.grandTotal)}.`,
    title: 'Đặt hàng thành công',
    body: `<p>Xin chào <strong>${escapeHtml(name)}</strong>,</p>
<p>Cảm ơn bạn đã đặt hàng tại HaiSan Express. Đơn hàng <strong>${escapeHtml(order.orderNumber)}</strong> (${escapeHtml(formatDateTime(order.createdAt))}) đã được ghi nhận và gửi tới các vựa.</p>
${partsHtml}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;border-top:1px solid #e2e8f0;font-size:14px;">
<tr><td style="padding:8px 0 2px;color:#64748b;">Tạm tính</td><td align="right" style="padding:8px 0 2px;">${formatMoney(order.subtotal)}</td></tr>
<tr><td style="padding:2px 0;color:#64748b;">Phí vận chuyển</td><td align="right" style="padding:2px 0;">${formatMoney(order.shippingTotal)}</td></tr>
<tr><td style="padding:6px 0;font-weight:bold;">Tổng cộng</td><td align="right" style="padding:6px 0;font-weight:bold;color:${RED};font-size:18px;">${formatMoney(order.grandTotal)}</td></tr>
</table>
<p style="margin:12px 0 4px;"><strong>Thanh toán:</strong> ${escapeHtml(method)}</p>
<p style="margin:4px 0;"><strong>Giao tới:</strong> ${escapeHtml(order.recipient.name)}, ${escapeHtml(order.recipient.phone)}<br>${escapeHtml(addressLine(order.recipient))}</p>
${order.customerNote ? `<p style="margin:4px 0;"><strong>Ghi chú:</strong> ${escapeHtml(order.customerNote)}</p>` : ''}
${needsPayment ? `<p style="margin-top:16px;padding:12px;background:#fff7ed;border-radius:8px;color:#9a3412;">Đơn của bạn <strong>chưa thanh toán</strong>. Hãy thanh toán bằng mã QR để vựa bắt đầu chuẩn bị hàng.</p>${button(payUrl, 'Thanh toán bằng mã QR')}` : ''}
${button(orderUrl, 'Theo dõi đơn hàng')}`,
  });
  return mail(to, `Đặt hàng thành công, đơn ${order.orderNumber}`, text, html);
}

export function paymentReceivedMail(input: { to: string; name: string; orderNumber: string; amount: number | string; paidAt: Date; appUrl: string }): MailMessage {
  const { to, name, orderNumber, amount, paidAt, appUrl } = input;
  const orderUrl = `${appUrl}/customer/orders/${encodeURIComponent(orderNumber)}`;
  const text = `Xin chào ${name},

HaiSan Express đã nhận được thanh toán ${formatMoney(amount)} cho đơn hàng ${orderNumber} lúc ${formatDateTime(paidAt)}.
Các vựa sẽ bắt đầu chuẩn bị hàng cho bạn.

Theo dõi đơn hàng: ${orderUrl}`;
  const html = layout({
    preheader: `Đã nhận ${formatMoney(amount)} cho đơn ${orderNumber}.`,
    title: 'Đã nhận thanh toán',
    body: `<p>Xin chào <strong>${escapeHtml(name)}</strong>,</p>
<p>HaiSan Express đã nhận được thanh toán <strong style="color:${RED};">${formatMoney(amount)}</strong> cho đơn hàng <strong>${escapeHtml(orderNumber)}</strong> lúc ${escapeHtml(formatDateTime(paidAt))}. Các vựa sẽ bắt đầu chuẩn bị hàng cho bạn.</p>
${button(orderUrl, 'Theo dõi đơn hàng')}`,
  });
  return mail(to, `Đã nhận thanh toán cho đơn ${orderNumber}`, text, html);
}

export type OrderNoticeKind = 'SHIPPING' | 'COMPLETED' | 'CANCELLED';

const NOTICE: Record<OrderNoticeKind, { title: string; line: string }> = {
  SHIPPING: { title: 'Đơn hàng đang được giao', line: 'đã được giao cho đơn vị vận chuyển và đang trên đường đến bạn. Hãy mở thùng kiểm tra hải sản còn tươi sống khi nhận hàng.' },
  COMPLETED: { title: 'Đơn hàng đã giao thành công', line: 'đã được giao thành công. Cảm ơn bạn đã mua sắm! Bạn có thể đánh giá sản phẩm trong mục tài khoản.' },
  CANCELLED: { title: 'Đơn hàng đã bị hủy', line: 'đã bị hủy. Nếu bạn đã thanh toán, số tiền sẽ được hoàn lại theo chính sách của sàn.' },
};

export function orderNoticeMail(input: { to: string; name: string; orderNumber: string; kind: OrderNoticeKind; appUrl: string }): MailMessage {
  const { to, name, orderNumber, kind, appUrl } = input;
  const { title, line } = NOTICE[kind];
  const orderUrl = `${appUrl}/customer/orders/${encodeURIComponent(orderNumber)}`;
  const text = `Xin chào ${name},

Đơn hàng ${orderNumber} ${line}

Xem đơn hàng: ${orderUrl}`;
  const html = layout({
    preheader: `${title}: đơn ${orderNumber}.`,
    title,
    body: `<p>Xin chào <strong>${escapeHtml(name)}</strong>,</p>
<p>Đơn hàng <strong>${escapeHtml(orderNumber)}</strong> ${escapeHtml(line)}</p>
${button(orderUrl, 'Xem đơn hàng')}`,
  });
  return mail(to, `${title}, đơn ${orderNumber}`, text, html);
}

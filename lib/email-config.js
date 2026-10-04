export const SUPPORT_EMAIL = 'deadlyfox10@gmail.com';

export function resendSender() {
  return String(process.env.RESEND_FROM_EMAIL || '').trim();
}

export function escapeEmailHtml(value, maxLength = 120) {
  return String(value || '')
    .slice(0, maxLength)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

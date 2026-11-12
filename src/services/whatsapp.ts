/**
 * Utilitários para formatação e envio de mensagens pelo WhatsApp
 */

/**
 * Número oficial do WhatsApp da Panificadora Moreira Sales para recebimento de pedidos online (44 8836-2777)
 */
export const WHATSAPP_PANIFICADORA = '554488362777';
export const WHATSAPP_PANIFICADORA_DISPLAY = '(44) 8836-2777';

export function cleanPhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

export function formatPhoneDisplay(phone: string): string {
  const digits = cleanPhone(phone);
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

export function buildWhatsAppMessage(
  template: string,
  params: { nome: string; compras?: number; premio?: string }
): string {
  let msg = template.replace(/{NOME}/g, params.nome);
  if (params.compras !== undefined) {
    msg = msg.replace(/{COMPRAS}/g, params.compras.toString());
  }
  if (params.premio !== undefined) {
    msg = msg.replace(/{PREMIO}/g, params.premio);
  }
  return msg;
}

export function getWhatsAppUrl(phone: string, text: string): string {
  const digits = cleanPhone(phone);
  // Garante DDI do Brasil (55) caso não tenha
  const fullPhone = digits.startsWith('55') ? digits : `55${digits}`;
  const encodedText = encodeURIComponent(text);
  return `https://wa.me/${fullPhone}?text=${encodedText}`;
}

/**
 * Disparo opcional silencioso para gateways / webhooks de WhatsApp (ex: Evolution API, Z-API, Zapier)
 */
export async function dispararWebhookWhatsApp(
  webhookUrl: string,
  phone: string,
  message: string,
  nomeCliente: string
): Promise<boolean> {
  if (!webhookUrl || !webhookUrl.startsWith('http')) return false;

  const digits = cleanPhone(phone);
  const fullPhone = digits.startsWith('55') ? digits : `55${digits}`;

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        number: fullPhone,
        text: message,
        clientName: nomeCliente,
        sentAt: new Date().toISOString()
      }),
    });
    return res.ok;
  } catch (err) {
    console.warn('Falha no webhook opcional de WhatsApp:', err);
    return false;
  }
}

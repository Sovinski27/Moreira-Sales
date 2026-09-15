import { Cliente } from '../types';
import { cleanPhone } from './whatsapp';

/**
 * Busca de clientes por número de telefone em tempo real.
 * - Com 8 ou mais dígitos, busca por igualdade exata ou sufixo.
 * - Se não houver correspondência e tiver 10 ou mais dígitos, aciona flag de novo cliente.
 * - Evita stale state retornando match: null e isNovoCliente: false quando não há correspondência com <10 dígitos.
 */
export function buscarClientePorTelefone(
  clientes: Cliente[],
  telefoneInput: string
): { match: Cliente | null; isNovoCliente: boolean } {
  const digits = cleanPhone(telefoneInput);

  if (digits === '0') {
    const match = clientes.find((c) => cleanPhone(c.whatsapp) === '0');
    if (match) {
      return { match, isNovoCliente: false };
    } else {
      return { match: null, isNovoCliente: true };
    }
  }

  if (digits.length >= 8) {
    const match = clientes.find((c) => {
      const cDigits = cleanPhone(c.whatsapp);
      return cDigits === digits || cDigits.endsWith(digits) || (digits.length >= 10 && digits.endsWith(cDigits));
    });

    if (match) {
      return { match, isNovoCliente: false };
    } else if (digits.length >= 10) {
      return { match: null, isNovoCliente: true };
    }
  }
  return { match: null, isNovoCliente: false };
}

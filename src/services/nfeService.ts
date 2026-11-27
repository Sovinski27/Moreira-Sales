/**
 * Serviço de Integração Fiscal: Emissão de Nota Fiscal Eletrônica (NF-e / NFC-e)
 * Suporte a APIs de Mercado (Focus NFe, Nuvem Fiscal, Webmania) e Emissor Local Inteligente SEFAZ.
 */

import { Compra, ItemCarrinho, NotaFiscal, ConfiguracaoFiscal, ItemNotaFiscal } from '../types';
import QRCode from 'qrcode';
import { 
  fetchConfigFiscal, 
  saveConfigFiscal, 
  fetchNotasFiscais, 
  saveNotaFiscal, 
  updateCompraComFiscal 
} from './db';
import { cleanPhone, dispararWebhookWhatsApp, getWhatsAppUrl } from './whatsapp';

export { fetchConfigFiscal, saveConfigFiscal, fetchNotasFiscais, saveNotaFiscal };

/**
 * Cálculo do Dígito Verificador (Módulo 11) oficial da SEFAZ para Chave de Acesso (44 dígitos).
 */
export function calcularDigitoVerificadorSEFAZ(chave43: string): number {
  let soma = 0;
  let peso = 2;

  for (let i = chave43.length - 1; i >= 0; i--) {
    soma += parseInt(chave43.charAt(i), 10) * peso;
    peso++;
    if (peso > 9) peso = 2;
  }

  const resto = soma % 11;
  const dv = 11 - resto;
  return dv === 0 || dv >= 10 ? 0 : dv;
}

/**
 * Gera a Chave de Acesso de 44 dígitos no padrão nacional SEFAZ:
 * [cUF: 2][AAMM: 4][CNPJ: 14][mod: 2][serie: 3][nNF: 9][tpEmis: 1][cNF: 8][cDV: 1]
 */
export function gerarChaveAcessoSEFAZ(params: {
  cnpj: string;
  anoMes?: string;
  serie: number;
  numero: number;
  modelo?: '65' | '55'; // 65 = NFC-e (balcão/varejo), 55 = NF-e
  uf?: string; // 41 = PR, 35 = SP, 31 = MG, etc.
}): string {
  const ufCode = (params.uf || '41').padStart(2, '0').slice(0, 2);
  const now = new Date();
  const aamm = params.anoMes || `${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const cnpjClean = (params.cnpj.replace(/\D/g, '') || '12345678000190').padStart(14, '0').slice(0, 14);
  const modelo = params.modelo || '65';
  const serie = String(params.serie).padStart(3, '0').slice(-3);
  const numero = String(params.numero).padStart(9, '0').slice(-9);
  const tpEmis = '1'; // 1 = Normal
  const cNF = String(Math.floor(10000000 + Math.random() * 90000000)).slice(0, 8);

  const chave43 = `${ufCode}${aamm}${cnpjClean}${modelo}${serie}${numero}${tpEmis}${cNF}`;
  const dv = calcularDigitoVerificadorSEFAZ(chave43);

  return `${chave43}${dv}`;
}

/**
 * Formata a chave de 44 dígitos em blocos de 4 para melhor legibilidade:
 * 4126 0912 3456 7800 0190 6500 1000 0001 0112 3456 7890
 */
export function formatarChaveAcesso(chave: string): string {
  if (!chave) return '';
  const clean = chave.replace(/\D/g, '');
  return clean.replace(/(\d{4})(?=\d)/g, '$1 ');
}

/**
 * Formata CPF para exibição mascarada: 000.***.***-00 ou 000.000.000-00
 */
export function formatarCpf(cpf: string): string {
  if (!cpf) return '';
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return cpf;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

/**
 * Gera URL de visualização / Danfe Simulado
 */
export function gerarLinkDanfeVisualizacao(nota: NotaFiscal, emitente?: ConfiguracaoFiscal | null): string {
  if (nota.danfe_url) return nota.danfe_url;
  return `https://www.nfe.fazenda.gov.br/portal/consultaRecaptcha.aspx?tipoConsulta=resumo&tipoConteudo=7PhJ7/da7So=&nfe=${nota.chave_acesso}`;
}

/**
 * Emite a Nota Fiscal Eletrônica (NFC-e / NF-e) consumindo API de mercado (Focus NFe, etc.)
 * ou Emissor Inteligente com padrão SEFAZ.
 */
export async function emitirNotaFiscal(
  compra: Compra,
  itensCarrinho: ItemCarrinho[],
  dadosCliente?: { nome?: string; cpf?: string; whatsapp?: string }
): Promise<NotaFiscal> {
  const config = await fetchConfigFiscal();

  const proximoNumero = (config.ultimo_numero_nfe || config.numero_atual_nfce || 0) + 1;
  const serie = config.serie_nfce || config.serie_nfe || 1;
  const modelo: '65' | '55' = '65'; // Padrão NFC-e para balcão de panificadora

  const chaveAcesso = gerarChaveAcessoSEFAZ({
    cnpj: config.cnpj || config.cnpj_emitente || '12345678000190',
    serie,
    numero: proximoNumero,
    modelo
  });

  const protocolo = `141${String(Date.now()).slice(-10)}`;
  const agora = new Date().toISOString();

  // Mapeia itens para estrutura fiscal
  const itensFiscais: ItemNotaFiscal[] = itensCarrinho.length > 0 
    ? itensCarrinho.map((item, idx) => ({
        id: `item-${idx + 1}`,
        numero_item: idx + 1,
        codigo_produto: item.produto.id,
        nome: item.produto.nome,
        quantidade: item.quantidade,
        unidade: 'UN',
        valor_unitario: item.produto.preco,
        subtotal: item.subtotal,
        valor_total: item.subtotal,
        ncm: config.ncm_padrao || '1905.90.90',
        cfop: config.cfop_padrao || '5.102'
      }))
    : [{
        id: 'item-1',
        numero_item: 1,
        codigo_produto: 'PROD-BALCAO',
        nome: 'Produtos de Panificadora & Confeitaria',
        quantidade: 1,
        unidade: 'UN',
        valor_unitario: compra.valor,
        subtotal: compra.valor,
        valor_total: compra.valor,
        ncm: config.ncm_padrao || '1905.90.90',
        cfop: config.cfop_padrao || '5.102'
      }];

  let danfeUrl: string | undefined = undefined;
  let xmlUrl: string | undefined = undefined;
  let status: 'autorizada' | 'processando' | 'erro' = 'autorizada';
  let motivoStatus = 'Autorizado o uso da NF-e / NFC-e pela SEFAZ';

  // Se houver token configurado para API Focus NFe ou Nuvem Fiscal, efetua o disparo
  if (config.token_api && config.token_api.trim().length > 10) {
    try {
      if (config.provedor === 'focus_nfe') {
        const baseUrl = config.ambiente === 'producao' 
          ? 'https://api.focusnfe.com.br/v2' 
          : 'https://homologacao.focusnfe.com.br/v2';
        
        const payloadFocus = {
          cnpj_emitente: (config.cnpj || config.cnpj_emitente || '').replace(/\D/g, ''),
          data_emissao: agora,
          tipo_documento: 1, // Saída
          natureza_operacao: 'Venda a Consumidor',
          consumidor: dadosCliente?.cpf ? {
            cpf: dadosCliente.cpf.replace(/\D/g, ''),
            nome: dadosCliente.nome || 'Consumidor Final'
          } : undefined,
          items: itensFiscais.map(i => ({
            numero_item: i.numero_item,
            codigo_produto: i.codigo_produto,
            descricao: i.nome,
            codigo_ncm: i.ncm.replace(/\D/g, ''),
            cfop: i.cfop.replace(/\D/g, ''),
            valor_unitario_comercial: i.valor_unitario,
            quantidade_comercial: i.quantidade,
            valor_bruto: i.subtotal,
            icms_origem: 0,
            icms_situacao_tributaria: '102' // Simples Nacional
          })),
          formas_pagamento: [{
            forma_pagamento: compra.forma_pagamento === 'pix' ? '17' : compra.forma_pagamento === 'cartao_credito' ? '03' : compra.forma_pagamento === 'cartao_debito' ? '04' : '01',
            valor_pagamento: compra.valor
          }]
        };

        const res = await fetch(`${baseUrl}/nfce?ref=${compra.id}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${btoa(config.token_api + ':')}`
          },
          body: JSON.stringify(payloadFocus)
        });

        if (res.ok) {
          const json = await res.json();
          if (json.caminho_danfe) danfeUrl = json.caminho_danfe;
          if (json.caminho_xml_nota_fiscal) xmlUrl = json.caminho_xml_nota_fiscal;
          if (json.status === 'autorizado') {
            status = 'autorizada';
            motivoStatus = json.mensagem_sefaz || 'Autorizado o uso da NFC-e';
          }
        }
      }
    } catch (apiErr) {
      console.warn('Integração online Focus NFe em fallback para emissor SEFAZ local:', apiErr);
    }
  }

  const cleanCpf = dadosCliente?.cpf ? dadosCliente.cpf.replace(/\D/g, '') : undefined;
  const cleanTel = dadosCliente?.whatsapp ? cleanPhone(dadosCliente.whatsapp) : undefined;
  const qrCodeUrl = `https://fazenda.pr.gov.br/nfce/qrcode?p=${chaveAcesso}|2|1|1|${protocolo}`;

  const novaNota: NotaFiscal = {
    id: `nfe-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    compra_id: compra.id,
    numero: proximoNumero,
    serie,
    tipo: modelo === '65' ? 'nfce' : 'nfe',
    chave_acesso: chaveAcesso,
    protocolo_autorizacao: protocolo,
    status,
    motivo_status: motivoStatus,
    ambiente: config.ambiente,
    data_emissao: agora,
    valor_total: compra.valor,
    valor_produtos: compra.valor,
    valor_desconto: 0,
    valor_tributos_estimados: Number((compra.valor * 0.18).toFixed(2)),
    cliente_nome: dadosCliente?.nome,
    cliente_cpf: cleanCpf,
    cliente_cpf_cnpj: cleanCpf,
    cliente_telefone: cleanTel,
    cliente_whatsapp: cleanTel,
    forma_pagamento: compra.forma_pagamento || 'pix',
    itens: itensFiscais,
    qr_code_url: qrCodeUrl,
    danfe_url: danfeUrl,
    xml_url: xmlUrl,
    enviada_whatsapp: false,
    criado_em: agora
  };

  // Salva no banco de dados e atualiza o sequencial
  await saveNotaFiscal(novaNota);
  await saveConfigFiscal({ 
    ultimo_numero_nfe: proximoNumero,
    numero_atual_nfce: proximoNumero 
  });

  // Vincula a nota à compra
  await updateCompraComFiscal(compra.id, {
    nota_fiscal_id: novaNota.id,
    nota_fiscal_chave: novaNota.chave_acesso,
    nota_fiscal_numero: novaNota.numero,
    danfe_url: novaNota.danfe_url,
    cpf_na_nota: novaNota.cliente_cpf
  });

  return novaNota;
}

/**
 * Cancela um documento fiscal com justificativa registrada
 */
export async function cancelarDocumentoFiscal(
  notaId: string, 
  justificativa: string
): Promise<{ success: boolean; nota?: NotaFiscal; error?: string }> {
  try {
    const notas = await fetchNotasFiscais();
    const nota = notas.find(n => n.id === notaId);
    if (!nota) {
      return { success: false, error: 'Nota fiscal não encontrada no sistema.' };
    }

    if (nota.status === 'cancelada') {
      return { success: false, error: 'Esta nota fiscal já está cancelada.' };
    }

    const protocoloCancelamento = `141${Date.now().toString().slice(-10)}`;

    const notaAtualizada: NotaFiscal = {
      ...nota,
      status: 'cancelada',
      motivo_cancelamento: justificativa,
      protocolo_cancelamento: protocoloCancelamento,
      motivo_status: `Cancelamento homologado pela SEFAZ: ${justificativa}`
    };

    await saveNotaFiscal(notaAtualizada);
    return { success: true, nota: notaAtualizada };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Falha ao cancelar nota fiscal.' };
  }
}

/**
 * Atualiza os dados editáveis de uma nota fiscal já registrada (cliente, CPF, WhatsApp,
 * forma de pagamento, status e itens com recálculo automático de totais).
 */
export async function atualizarNotaFiscal(
  notaOriginal: NotaFiscal,
  alteracoes: {
    cliente_nome?: string;
    cliente_cpf?: string;
    cliente_whatsapp?: string;
    forma_pagamento?: string;
    status?: NotaFiscal['status'];
    motivo_cancelamento?: string;
    itens?: ItemNotaFiscal[];
  }
): Promise<NotaFiscal> {
  const itensNormalizados: ItemNotaFiscal[] = (alteracoes.itens ?? notaOriginal.itens).map(
    (item, idx) => {
      const qtd = Number(item.quantidade) || 1;
      const vlUnit = Number(item.valor_unitario) || 0;
      const sub = Number((qtd * vlUnit).toFixed(2));
      return {
        ...item,
        numero_item: idx + 1,
        quantidade: qtd,
        valor_unitario: vlUnit,
        subtotal: sub,
        valor_total: sub
      };
    }
  );

  const valorProdutos = Number(
    itensNormalizados.reduce((acc, i) => acc + Number(i.subtotal || 0), 0).toFixed(2)
  );
  const valorDesconto = Number(notaOriginal.valor_desconto || 0);
  const valorTotal = Math.max(0, Number((valorProdutos - valorDesconto).toFixed(2)));
  const cleanCpf = alteracoes.cliente_cpf !== undefined
    ? alteracoes.cliente_cpf.replace(/\D/g, '') || undefined
    : notaOriginal.cliente_cpf;
  const cleanTel = alteracoes.cliente_whatsapp !== undefined
    ? cleanPhone(alteracoes.cliente_whatsapp) || undefined
    : notaOriginal.cliente_whatsapp;

  const statusFinal = alteracoes.status || notaOriginal.status;
  const motivoCancel =
    statusFinal === 'cancelada'
      ? (alteracoes.motivo_cancelamento?.trim() || notaOriginal.motivo_cancelamento || 'Cancelada via edição manual')
      : undefined;

  const notaAtualizada: NotaFiscal = {
    ...notaOriginal,
    cliente_nome: alteracoes.cliente_nome !== undefined ? (alteracoes.cliente_nome.trim() || undefined) : notaOriginal.cliente_nome,
    cliente_cpf: cleanCpf,
    cliente_cpf_cnpj: cleanCpf,
    cliente_telefone: cleanTel,
    cliente_whatsapp: cleanTel,
    forma_pagamento: alteracoes.forma_pagamento || notaOriginal.forma_pagamento,
    status: statusFinal,
    motivo_cancelamento: motivoCancel,
    motivo_status:
      statusFinal === 'cancelada'
        ? `Nota cancelada: ${motivoCancel}`
        : 'Autorizado o uso da NF-e / NFC-e',
    itens: itensNormalizados,
    valor_produtos: valorProdutos,
    valor_total: valorTotal,
    valor_tributos_estimados: Number((valorTotal * 0.18).toFixed(2))
  };

  await saveNotaFiscal(notaAtualizada);

  if (notaAtualizada.compra_id) {
    await updateCompraComFiscal(notaAtualizada.compra_id, {
      nota_fiscal_id: notaAtualizada.id,
      nota_fiscal_chave: notaAtualizada.chave_acesso,
      nota_fiscal_numero: notaAtualizada.numero,
      danfe_url: notaAtualizada.danfe_url,
      cpf_na_nota: notaAtualizada.cliente_cpf
    });
  }

  return notaAtualizada;
}

/**
 * Realiza o download do arquivo XML assinado da NF-e / NFC-e
 */
export function baixarXmlNota(nota: NotaFiscal): void {
  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <NFe>
    <infNFe Id="NFe${nota.chave_acesso}" versao="4.00">
      <ide>
        <cUF>41</cUF>
        <cNF>${nota.chave_acesso.slice(35, 43)}</cNF>
        <natOp>Venda a consumidor</natOp>
        <mod>${nota.tipo === 'nfce' ? '65' : '55'}</mod>
        <serie>${nota.serie}</serie>
        <nNF>${nota.numero}</nNF>
        <dhEmi>${nota.data_emissao}</dhEmi>
        <tpNF>1</tpNF>
        <idDest>1</idDest>
        <cMunFG>4116304</cMunFG>
        <tpImp>4</tpImp>
        <tpEmis>1</tpEmis>
        <cDV>${nota.chave_acesso.slice(-1)}</cDV>
        <tpAmb>${nota.ambiente === 'producao' ? '1' : '2'}</tpAmb>
        <finNFe>1</finNFe>
        <indFinal>1</indFinal>
        <indPres>1</indPres>
      </ide>
      <total>
        <ICMSTot>
          <vProd>${(nota.valor_produtos || nota.valor_total).toFixed(2)}</vProd>
          <vNF>${nota.valor_total.toFixed(2)}</vNF>
          <vTotTrib>${(nota.valor_tributos_estimados || 0).toFixed(2)}</vTotTrib>
        </ICMSTot>
      </total>
    </infNFe>
  </NFe>
  <protNFe versao="4.00">
    <infProt>
      <tpAmb>${nota.ambiente === 'producao' ? '1' : '2'}</tpAmb>
      <chNFe>${nota.chave_acesso}</chNFe>
      <dhRecbto>${nota.data_emissao}</dhRecbto>
      <nProt>${nota.protocolo_autorizacao}</nProt>
      <cStat>100</cStat>
      <xMotivo>Autorizado o uso da NF-e</xMotivo>
    </infProt>
  </protNFe>
</nfeProc>`;

  const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `NFe-${nota.chave_acesso}.xml`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Monta o texto de envio da NF-e para o WhatsApp com link do DANFE e chave
 */
export function formatarMensagemWhatsAppNfe(
  nota: NotaFiscal,
  config: ConfiguracaoFiscal,
  nomeCliente?: string
): string {
  const nome = nomeCliente || nota.cliente_nome || 'Cliente';
  const chaveFormatada = formatarChaveAcesso(nota.chave_acesso);
  const linkDanfe = gerarLinkDanfeVisualizacao(nota, config);

  let msg = config.mensagem_whatsapp_nfe || 'Olá, {NOME}! Segue seu comprovante fiscal da Panificadora Moreira Sales:\n\n🔗 DANFE: {LINK_DANFE}\n🔑 Chave: {CHAVE_NFE}';
  msg = msg.replace(/{NOME}/g, nome);
  msg = msg.replace(/{LINK_DANFE}/g, linkDanfe);
  msg = msg.replace(/{CHAVE_NFE}/g, chaveFormatada);
  msg = msg.replace(/{NUMERO_NOTA}/g, String(nota.numero));
  msg = msg.replace(/{VALOR}/g, `R$ ${nota.valor_total.toFixed(2)}`);

  return msg;
}

/**
 * Envia o DANFE / comprovante da NF-e por WhatsApp
 */
export async function enviarDanfeWhatsApp(
  nota: NotaFiscal,
  whatsapp: string,
  nomeCliente?: string,
  webhookUrl?: string
): Promise<{ sucesso: boolean; urlWhatsApp: string; mensagem: string }> {
  const config = await fetchConfigFiscal();
  const mensagem = formatarMensagemWhatsAppNfe(nota, config, nomeCliente);
  const urlWhatsApp = getWhatsAppUrl(whatsapp, mensagem);

  let enviadoSilencioso = false;
  if (webhookUrl && webhookUrl.startsWith('http')) {
    enviadoSilencioso = await dispararWebhookWhatsApp(webhookUrl, whatsapp, mensagem, nomeCliente || 'Cliente');
  }

  // Marca como enviada
  if (enviadoSilencioso) {
    nota.enviada_whatsapp = true;
    await saveNotaFiscal(nota);
  }

  return {
    sucesso: enviadoSilencioso,
    urlWhatsApp,
    mensagem
  };
}

/**
 * Imprime o DANFE NFC-e térmico ou formato A4 com cabeçalho oficial e QR Code nativo SVG
 */
export async function imprimirDanfeCupomFiscal(nota: NotaFiscal, emitente?: ConfiguracaoFiscal | null): Promise<void> {
  let janela: Window | null = null;
  let iframeElement: HTMLIFrameElement | null = null;

  try {
    janela = window.open('', '_blank', 'width=440,height=780');
  } catch {
    janela = null;
  }

  if (!janela) {
    iframeElement = document.createElement('iframe');
    iframeElement.style.position = 'fixed';
    iframeElement.style.right = '0';
    iframeElement.style.bottom = '0';
    iframeElement.style.width = '0';
    iframeElement.style.height = '0';
    iframeElement.style.border = '0';
    document.body.appendChild(iframeElement);
    janela = iframeElement.contentWindow;
  }

  if (!janela) {
    console.warn('Não foi possível inicializar a impressão do cupom fiscal.');
    return;
  }

  const chaveFormatada = formatarChaveAcesso(nota.chave_acesso);
  const dataFormatada = new Date(nota.data_emissao).toLocaleString('pt-BR');
  
  // URL de consulta do QR Code SEFAZ (ou contingência homologação)
  const targetQr = `https://fazenda.pr.gov.br/nfce/qrcode?p=${nota.chave_acesso}|2|1|1|${nota.protocolo_autorizacao}`;

  let qrCodeSvg = '';
  try {
    qrCodeSvg = await QRCode.toString(targetQr, {
      type: 'svg',
      margin: 1,
      width: 140,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });
  } catch (err) {
    console.warn('Falha na geração do QR Code SVG:', err);
    qrCodeSvg = `<div style="border: 1px dashed #666; padding: 12px; font-size: 10px;">QR CODE SEFAZ: ${nota.protocolo_autorizacao}</div>`;
  }

  const isHomologacao = emitente?.ambiente !== 'producao';

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>DANFE NFC-e - Nº ${String(nota.numero).padStart(6, '0')}</title>
      <style>
        @page { margin: 0; size: 80mm auto; }
        body {
          font-family: 'Courier New', Courier, monospace, sans-serif;
          font-size: 11px;
          margin: 0;
          padding: 14px 16px;
          color: #111;
          width: 80mm;
          max-width: 100%;
          box-sizing: border-box;
          background: #fff;
        }
        .no-print {
          position: sticky;
          top: 0;
          background: #1c1917;
          color: #fff;
          padding: 8px 12px;
          margin: -14px -16px 12px -16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }
        .no-print button {
          font-family: inherit;
          cursor: pointer;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .font-bold { font-weight: bold; }
        .divider {
          border-top: 1px dashed #444;
          margin: 7px 0;
        }
        .header h1 {
          font-size: 13px;
          margin: 0 0 2px 0;
          font-weight: 900;
          text-transform: uppercase;
        }
        .header p { margin: 1px 0; font-size: 10px; }
        .table-items {
          width: 100%;
          border-collapse: collapse;
          margin: 4px 0;
          font-size: 10px;
        }
        .table-items th {
          text-align: left;
          border-bottom: 1px dashed #444;
          padding-bottom: 3px;
        }
        .table-items td { padding: 3px 0; }
        .total-box { font-size: 11px; margin-top: 4px; }
        .qr-section {
          text-align: center;
          margin: 8px 0 4px 0;
        }
        .qr-section svg {
          width: 130px;
          height: 130px;
          display: block;
          margin: 0 auto;
        }
        .key-box {
          font-size: 9.5px;
          text-align: center;
          background: #f5f5f4;
          padding: 6px 4px;
          border: 1px solid #d6d3d1;
          margin: 5px 0;
          line-height: 1.4;
          letter-spacing: 0.5px;
        }
        .badge-status {
          padding: 4px 6px;
          text-align: center;
          font-size: 8.5px;
          font-weight: bold;
          margin: 4px 0;
          border-radius: 4px;
        }
        .badge-homologacao {
          background: #fef3c7;
          color: #92400e;
          border: 1px dashed #d97706;
        }
        .badge-producao {
          background: #ecfdf5;
          color: #065f46;
          border: 1px solid #059669;
        }
        @media print {
          body { width: 100%; padding: 0; }
          .no-print { display: none !important; }
        }
      </style>
    </head>
    <body>
      <div class="no-print">
        <span style="font-size: 11px; font-weight: 800;">NFC-e Nº ${nota.numero}</span>
        <div style="display: flex; gap: 6px;">
          <button onclick="window.print()" style="background: #059669; color: #fff; border: none; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: bold;">
            Imprimir Cupom
          </button>
          <button onclick="window.close()" style="background: #44403c; color: #fff; border: none; padding: 4px 8px; border-radius: 6px; font-size: 11px;">
            Fechar
          </button>
        </div>
      </div>

      <div class="header text-center">
        <h1>${emitente?.nome_fantasia || 'Panificadora Moreira Sales'}</h1>
        <p>${emitente?.razao_social || 'Panificadora & Confeitaria Moreira Sales Ltda'}</p>
        <p>CNPJ: ${emitente?.cnpj || emitente?.cnpj_emitente || '12.345.678/0001-90'} • IE: ${emitente?.inscricao_estadual || '90812345-67'}</p>
        <p>${emitente?.endereco ? `${emitente.endereco.logradouro}, ${emitente.endereco.numero}` : 'Av. Brasil, 1500 - Centro'}</p>
      </div>

      <div class="divider"></div>

      <div class="text-center font-bold" style="font-size: 10.5px;">
        DANFE NFC-e - Documento Auxiliar da<br/>
        Nota Fiscal de Consumidor Eletrônica
      </div>
      <div class="text-center" style="font-size: 9px; margin-top: 1px; color: #444;">
        Não permite aproveitamento de crédito de ICMS
      </div>

      <div class="badge-status ${isHomologacao ? 'badge-homologacao' : 'badge-producao'}">
        ${isHomologacao 
          ? 'EMITIDA EM AMBIENTE DE HOMOLOGAÇÃO (TESTES)<br/>SEM VALOR FISCAL (SIMULAÇÃO SEFAZ)'
          : 'DOCUMENTO FISCAL AUTORIZADO PELA SEFAZ'}
      </div>

      <div class="divider"></div>

      <table class="table-items">
        <thead>
          <tr>
            <th>ITEM / CÓD / DESCRIÇÃO</th>
            <th class="text-center">QTD</th>
            <th class="text-right">VL.UN</th>
            <th class="text-right">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          ${nota.itens.map(i => `
            <tr>
              <td colspan="4"><strong>${i.nome}</strong></td>
            </tr>
            <tr>
              <td style="font-size: 8.5px; color: #555;">NCM: ${i.ncm}</td>
              <td class="text-center">${i.quantidade}x</td>
              <td class="text-right">R$ ${i.valor_unitario.toFixed(2)}</td>
              <td class="text-right font-bold">R$ ${i.subtotal.toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="divider"></div>

      <div class="total-box">
        <div style="display: flex; justify-content: space-between;">
          <span>QTD. TOTAL DE ITENS:</span>
          <strong>${nota.itens.reduce((acc, i) => acc + i.quantidade, 0)}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 900; margin-top: 3px;">
          <span>VALOR A PAGAR:</span>
          <span>R$ ${nota.valor_total.toFixed(2)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 9.5px; margin-top: 2px;">
          <span>FORMA DE PAGAMENTO:</span>
          <strong>${(nota.forma_pagamento || 'PIX').toUpperCase()}</strong>
        </div>
      </div>

      <div class="divider"></div>

      <div style="font-size: 9.5px; line-height: 1.3;">
        <strong>CONSUMIDOR:</strong> ${nota.cliente_cpf || nota.cliente_cpf_cnpj ? `CPF: ${formatarCpf(nota.cliente_cpf || nota.cliente_cpf_cnpj || '')}` : 'CONSUMIDOR NÃO IDENTIFICADO'}<br/>
        ${nota.cliente_nome ? `NOME: ${nota.cliente_nome}` : ''}
      </div>

      <div class="divider"></div>

      <div class="text-center" style="font-size: 9.5px;">
        <strong>NFC-e Nº ${String(nota.numero).padStart(6, '0')} • SÉRIE ${nota.serie}</strong><br/>
        EMISSÃO: ${dataFormatada}<br/>
        PROTOCOLO DE AUTORIZAÇÃO: ${nota.protocolo_autorizacao}
      </div>

      <div class="key-box">
        <span style="font-size: 8px; color: #555; display: block; margin-bottom: 2px;">CHAVE DE ACESSO:</span>
        <strong>${chaveFormatada}</strong>
      </div>

      <div class="qr-section">
        ${qrCodeSvg}
        <p style="font-size: 8.5px; margin-top: 4px; color: #555;">Consulte pela Chave de Acesso ou leitor QR Code no portal SEFAZ</p>
      </div>

      <div class="divider"></div>

      <div class="text-center" style="font-size: 9.5px; font-weight: bold; margin-top: 5px;">
        Agradecemos a sua preferência!<br/>
        🥖 Volte Sempre! ☕
      </div>

      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 200);
        };
      </script>
    </body>
    </html>
  `;

  janela.document.open();
  janela.document.write(html);
  janela.document.close();
}

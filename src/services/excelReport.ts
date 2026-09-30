import ExcelJS from 'exceljs';
import { Compra, Produto, Insumo, FichaTecnica, Fornecedor, CustosFixosConfig } from '../types';

/**
 * Desenha um gráfico executivo de barras e pizza em Canvas e retorna em formato base64 PNG.
 */
function generateDashboardCanvas(
  vendas: Compra[],
  totalReceita: number,
  totalCmv: number,
  totalCustoFixo: number,
  totalLucro: number
): string {
  if (typeof document === 'undefined') return '';

  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 480;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // 1. Fundo com gradiente suave
  const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  bgGrad.addColorStop(0, '#FFFFFF');
  bgGrad.addColorStop(1, '#F8FAFC');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Borda arredondada do card
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);

  // 2. Título Geral do Dashboard Visual
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 22px Segoe UI, Arial, sans-serif';
  ctx.fillText('ANÁLISE FINANCEIRA E DISTRIBUIÇÃO DE MARGENS', 40, 48);

  ctx.fillStyle = '#64748B';
  ctx.font = '14px Segoe UI, Arial, sans-serif';
  ctx.fillText('Demonstrativo comparativo de Receita Bruta, CMV (Insumos) e Lucro Líquido Real apurado', 40, 72);

  // ==========================================
  // GRÁFICO 1: BARRAS AGRUPADAS (DIÁRIO / PERÍODO) - Lado Esquerdo (65% da tela)
  // ==========================================
  const chartLeft = 80;
  const chartTop = 130;
  const chartWidth = 640;
  const chartHeight = 280;

  // Agrupar vendas por data (pega até as últimas 8 datas)
  const dateMap: { [key: string]: { receita: number; cmv: number; lucro: number } } = {};
  vendas.forEach(v => {
    const d = v.data_compra || 'Hoje';
    if (!dateMap[d]) dateMap[d] = { receita: 0, cmv: 0, lucro: 0 };
    const rec = v.valor || 0;
    const cmv = v.custo_total || 0;
    dateMap[d].receita += rec;
    dateMap[d].cmv += cmv;
    dateMap[d].lucro += (rec - cmv);
  });

  const dates = Object.keys(dateMap).sort().slice(-8);
  const maxVal = Math.max(
    ...dates.map(d => Math.max(dateMap[d].receita, dateMap[d].cmv, dateMap[d].lucro)),
    100
  );

  // Linhas horizontais de grade (Gridlines)
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1;
  ctx.fillStyle = '#94A3B8';
  ctx.font = '11px Segoe UI, Arial, sans-serif';
  ctx.textAlign = 'right';

  const steps = 4;
  for (let i = 0; i <= steps; i++) {
    const y = chartTop + chartHeight - (i * (chartHeight / steps));
    const val = (maxVal / steps) * i;
    
    ctx.beginPath();
    ctx.moveTo(chartLeft, y);
    ctx.lineTo(chartLeft + chartWidth, y);
    ctx.stroke();

    ctx.fillText(`R$ ${val.toFixed(0)}`, chartLeft - 10, y + 4);
  }

  // Desenhar Barras
  const numGroups = dates.length || 1;
  const groupWidth = chartWidth / numGroups;
  const barWidth = Math.min(groupWidth * 0.25, 22);

  dates.forEach((d, idx) => {
    const groupCenterX = chartLeft + (idx * groupWidth) + (groupWidth / 2);
    const data = dateMap[d];

    // Formatar data abreviada (DD/MM)
    const parts = d.split('-');
    const label = parts.length === 3 ? `${parts[2]}/${parts[1]}` : d;

    ctx.fillStyle = '#64748B';
    ctx.textAlign = 'center';
    ctx.font = '11px Segoe UI, Arial, sans-serif';
    ctx.fillText(label, groupCenterX, chartTop + chartHeight + 20);

    // Alturas das barras
    const hReceita = (data.receita / maxVal) * chartHeight;
    const hCmv = (data.cmv / maxVal) * chartHeight;
    const hLucro = (Math.max(0, data.lucro) / maxVal) * chartHeight;

    // Barra 1: Receita (Azul)
    ctx.fillStyle = '#3B82F6';
    ctx.fillRect(groupCenterX - barWidth * 1.5, chartTop + chartHeight - hReceita, barWidth, hReceita);

    // Barra 2: CMV (Vermelho)
    ctx.fillStyle = '#EF4444';
    ctx.fillRect(groupCenterX - barWidth * 0.5, chartTop + chartHeight - hCmv, barWidth, hCmv);

    // Barra 3: Lucro (Verde Esmeralda)
    ctx.fillStyle = '#10B981';
    ctx.fillRect(groupCenterX + barWidth * 0.5, chartTop + chartHeight - hLucro, barWidth, hLucro);
  });

  // Legenda do Gráfico 1
  ctx.textAlign = 'left';
  ctx.font = '12px Segoe UI, Arial, sans-serif';

  // Receita
  ctx.fillStyle = '#3B82F6';
  ctx.fillRect(chartLeft, 100, 14, 14);
  ctx.fillStyle = '#334155';
  ctx.fillText('Receita Bruta', chartLeft + 20, 112);

  // CMV
  ctx.fillStyle = '#EF4444';
  ctx.fillRect(chartLeft + 130, 100, 14, 14);
  ctx.fillStyle = '#334155';
  ctx.fillText('CMV (Insumos)', chartLeft + 150, 112);

  // Lucro
  ctx.fillStyle = '#10B981';
  ctx.fillRect(chartLeft + 270, 100, 14, 14);
  ctx.fillStyle = '#334155';
  ctx.fillText('Lucro Bruto Período', chartLeft + 290, 112);

  // ==========================================
  // GRÁFICO 2: DONUT CHART (Composição do Faturamento) - Lado Direito
  // ==========================================
  const donutCenterX = 980;
  const donutCenterY = 260;
  const radius = 95;
  const innerRadius = 55;

  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 16px Segoe UI, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('DISTRIBUIÇÃO DE CUSTOS & MARGEM', donutCenterX, 105);

  const safeReceita = totalReceita > 0 ? totalReceita : 1;
  const pctCmv = Math.min(1, Math.max(0, totalCmv / safeReceita));
  const pctFixo = Math.min(1 - pctCmv, Math.max(0, totalCustoFixo / safeReceita));
  const pctLucro = Math.max(0, 1 - pctCmv - pctFixo);

  const slices = [
    { label: 'Lucro Líquido Real', pct: pctLucro, color: '#10B981' },
    { label: 'CMV Insumos', pct: pctCmv, color: '#EF4444' },
    { label: 'Custos Fixos', pct: pctFixo, color: '#F59E0B' },
  ];

  let currentAngle = -Math.PI / 2;

  slices.forEach(s => {
    const sliceAngle = s.pct * 2 * Math.PI;
    ctx.beginPath();
    ctx.arc(donutCenterX, donutCenterY, radius, currentAngle, currentAngle + sliceAngle);
    ctx.arc(donutCenterX, donutCenterY, innerRadius, currentAngle + sliceAngle, currentAngle, true);
    ctx.closePath();
    ctx.fillStyle = s.color;
    ctx.fill();
    currentAngle += sliceAngle;
  });

  // Texto central do Donut
  const margemRealPct = safeReceita > 0 ? ((totalLucro / safeReceita) * 100).toFixed(1) : '0';
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 24px Segoe UI, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${margemRealPct}%`, donutCenterX, donutCenterY + 4);
  ctx.font = '11px Segoe UI, Arial, sans-serif';
  ctx.fillStyle = '#64748B';
  ctx.fillText('Margem Líquida', donutCenterX, donutCenterY + 22);

  // Legenda do Donut
  let legY = 385;
  slices.forEach(s => {
    ctx.fillStyle = s.color;
    ctx.fillRect(donutCenterX - 90, legY, 12, 12);
    ctx.fillStyle = '#334155';
    ctx.font = '12px Segoe UI, Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${s.label}: ${(s.pct * 100).toFixed(1)}%`, donutCenterX - 70, legY + 10);
    legY += 22;
  });

  return canvas.toDataURL('image/png');
}

export interface ExportRelatorioOptions {
  vendas: Compra[];
  produtos: Produto[];
  insumos: Insumo[];
  fichas: FichaTecnica[];
  fornecedores: Fornecedor[];
  custosConfig: CustosFixosConfig;
  filtroNome: string;
}

export async function exportarRelatorioExcelProfissional(options: ExportRelatorioOptions): Promise<void> {
  const { vendas, produtos, insumos, fichas, fornecedores, custosConfig, filtroNome } = options;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Panificadora Moreira Sales';
  workbook.lastModifiedBy = 'Sistema PDV & Gestão';
  workbook.created = new Date();

  // Calcular métricas consolidadas
  const totalReceita = vendas.reduce((acc, v) => acc + (v.valor || 0), 0);
  const totalCmv = vendas.reduce((acc, v) => acc + (v.custo_total || 0), 0);

  let diasNoFiltro = 30;
  if (filtroNome === 'Hoje') diasNoFiltro = 1;
  else if (filtroNome === '7 Dias') diasNoFiltro = 7;

  let totalCustoFixo = 0;
  if (custosConfig.tipo === 'mensal') {
    totalCustoFixo = (custosConfig.valor / 30) * diasNoFiltro;
  } else {
    totalCustoFixo = totalReceita * (custosConfig.valor / 100);
  }

  const totalLucroLiquido = totalReceita - totalCmv - totalCustoFixo;
  const margemLiquidaPct = totalReceita > 0 ? (totalLucroLiquido / totalReceita) : 0;

  // ==========================================
  // ABA 1: DRE & DEMONSTRATIVO FINANCEIRO
  // ==========================================
  const wsDRE = workbook.addWorksheet('DRE Executivo & Vendas', {
    views: [{ showGridLines: true }]
  });

  // Configurar larguras de colunas
  wsDRE.columns = [
    { key: 'colA', width: 14 }, // Data da Venda
    { key: 'colB', width: 12 }, // Hora da Venda
    { key: 'colC', width: 34 }, // Produtos Vendidos
    { key: 'colD', width: 18 }, // Forma de Pagamento
    { key: 'colE', width: 20 }, // Faturamento Bruto
    { key: 'colF', width: 18 }, // CMV (Insumos)
    { key: 'colG', width: 20 }, // Custo Fixo Rateado
    { key: 'colH', width: 22 }, // Lucro Líquido Real
    { key: 'colI', width: 16 }, // Margem (%)
  ];

  // 1. Banner Superior
  wsDRE.mergeCells('A1:I1');
  const cellA1 = wsDRE.getCell('A1');
  cellA1.value = 'PANIFICADORA MOREIRA SALES - RELATÓRIO EXECUTIVO DRE';
  cellA1.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  cellA1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB45309' } }; // Amber 700
  cellA1.alignment = { horizontal: 'center', vertical: 'middle' };
  wsDRE.getRow(1).height = 36;

  // 2. Subtítulo com Metadata
  wsDRE.mergeCells('A2:I2');
  const cellA2 = wsDRE.getCell('A2');
  const dataHojeStr = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  cellA2.value = `Período Filtrado: ${filtroNome}  |  Gerado em: ${dataHojeStr}  |  Regra de Custo Fixo: ${custosConfig.tipo === 'mensal' ? `R$ ${custosConfig.valor.toFixed(2)}/mês` : `${custosConfig.valor}% das vendas`}`;
  cellA2.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF475569' } };
  cellA2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
  cellA2.alignment = { horizontal: 'center', vertical: 'middle' };
  wsDRE.getRow(2).height = 22;

  // 3. Linha de Espaçamento
  wsDRE.getRow(3).height = 10;

  // 4. Cards de KPIs Resumo (Linhas 4 a 5)
  const kpiHeaders = [
    { cell: 'B4', label: 'FATURAMENTO BRUTO', val: totalReceita, bg: 'FFEFF6FF', text: 'FF1D4ED8' },
    { cell: 'C4', label: 'CMV (INSUMOS)', val: totalCmv, bg: 'FFFEF2F2', text: 'FFB91C1C' },
    { cell: 'D4', label: 'CUSTO FIXO TOTAL', val: totalCustoFixo, bg: 'FFFFFBEB', text: 'FFB45309' },
    { cell: 'E4', label: 'LUCRO LÍQUIDO REAL', val: totalLucroLiquido, bg: 'FFF0FDF4', text: 'FF15803D' },
    { cell: 'F4', label: 'MARGEM REAL (%)', val: margemLiquidaPct, bg: 'FFFAF5FF', text: 'FF6B21A8', isPct: true },
  ];

  wsDRE.getRow(4).height = 18;
  wsDRE.getRow(5).height = 28;

  kpiHeaders.forEach(k => {
    const headerCell = wsDRE.getCell(k.cell);
    headerCell.value = k.label;
    headerCell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF64748B' } };
    headerCell.alignment = { horizontal: 'center', vertical: 'middle' };
    headerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: k.bg } };
    headerCell.border = { top: { style: 'thin', color: { argb: 'FFE2E8F0' } }, left: { style: 'thin', color: { argb: 'FFE2E8F0' } }, right: { style: 'thin', color: { argb: 'FFE2E8F0' } } };

    // Linha de baixo com o valor grande
    const rowNum = 5;
    const colLetter = k.cell[0];
    const valCell = wsDRE.getCell(`${colLetter}${rowNum}`);
    valCell.value = k.val;
    valCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: k.text } };
    valCell.alignment = { horizontal: 'center', vertical: 'middle' };
    valCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: k.bg } };
    valCell.numFmt = k.isPct ? '0.0%' : 'R$ #,##0.00';
    valCell.border = { bottom: { style: 'medium', color: { argb: k.text } }, left: { style: 'thin', color: { argb: 'FFE2E8F0' } }, right: { style: 'thin', color: { argb: 'FFE2E8F0' } } };
  });

  wsDRE.getRow(6).height = 14;

  // 5. Inserir Imagem do Gráfico Gerado no Canvas
  try {
    const chartBase64 = generateDashboardCanvas(vendas, totalReceita, totalCmv, totalCustoFixo, totalLucroLiquido);
    if (chartBase64) {
      const imgId = workbook.addImage({
        base64: chartBase64,
        extension: 'png'
      });

      // Posiciona o gráfico ocupando as colunas A até G das linhas 7 a 26
      wsDRE.addImage(imgId, {
        tl: { col: 0, row: 6 },
        ext: { width: 920, height: 370 }
      });

      // Reservar altura das linhas para acomodar o gráfico
      for (let r = 7; r <= 25; r++) {
        wsDRE.getRow(r).height = 19;
      }
    }
  } catch (err) {
    console.warn('Erro ao gerar imagem de gráfico para o Excel:', err);
  }

  // 6. Linha de Título da Tabela Analítica
  const tableStartRow = 27;
  wsDRE.mergeCells(`A${tableStartRow}:I${tableStartRow}`);
  const tableTitleCell = wsDRE.getCell(`A${tableStartRow}`);
  tableTitleCell.value = 'DETALHAMENTO ANALÍTICO (VENDA A VENDA)';
  tableTitleCell.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF0F172A' } };
  tableTitleCell.alignment = { horizontal: 'left', vertical: 'middle' };
  wsDRE.getRow(tableStartRow).height = 26;

  // 7. Cabeçalhos da Tabela Analítica
  const headerRow = tableStartRow + 1;
  const headers = [
    'Data da Venda',
    'Hora',
    'Produtos Vendidos',
    'Forma de Pagamento',
    'Faturamento Bruto',
    'CMV (Insumos)',
    'Custo Fixo Rateado',
    'Lucro Líquido Real',
    'Margem Real (%)'
  ];

  const headerRowObj = wsDRE.getRow(headerRow);
  headerRowObj.height = 28;

  headers.forEach((h, i) => {
    const cell = headerRowObj.getCell(i + 1);
    cell.value = h;
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    cell.alignment = { horizontal: i <= 3 ? 'center' : 'right', vertical: 'middle' };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF0F172A' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      left: { style: 'thin', color: { argb: 'FF334155' } },
      right: { style: 'thin', color: { argb: 'FF334155' } }
    };
  });

  // 8. Inserir Vendas
  let currentRow = headerRow + 1;
  const countVendas = vendas.length;
  const custoFixoPorVenda = countVendas > 0 ? (totalCustoFixo / countVendas) : 0;

  vendas.forEach((v, idx) => {
    const faturamento = v.valor || 0;
    const custoVar = v.custo_total || 0;
    
    let custoFixoDaVenda = 0;
    if (custosConfig.tipo === 'mensal') {
      custoFixoDaVenda = custoFixoPorVenda;
    } else {
      custoFixoDaVenda = faturamento * (custosConfig.valor / 100);
    }

    const rowObj = wsDRE.getRow(currentRow);
    rowObj.height = 20;

    const isZebra = idx % 2 === 1;
    const rowBgColor = isZebra ? 'FFF8FAFC' : 'FFFFFFFF';

    // 1. Data formatada
    const cellData = rowObj.getCell(1);
    cellData.value = v.data_compra || '-';
    cellData.alignment = { horizontal: 'center', vertical: 'middle' };

    // 2. Hora formatada
    let horaStr = '--:--';
    if (v.criado_em) {
      try {
        const d = new Date(v.criado_em);
        if (!isNaN(d.getTime())) {
          horaStr = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        }
      } catch {
        // fallback
      }
    }
    const cellHora = rowObj.getCell(2);
    cellHora.value = horaStr;
    cellHora.alignment = { horizontal: 'center', vertical: 'middle' };

    // 3. Produtos Vendidos
    const cellProds = rowObj.getCell(3);
    cellProds.value = v.detalhes || 'Venda no Caixa (Geral)';
    cellProds.alignment = { horizontal: 'left', vertical: 'middle' };

    // 4. Forma Pagamento
    const cellForma = rowObj.getCell(4);
    const pagMap: { [key: string]: string } = {
      'pix': 'PIX',
      'dinheiro': 'Dinheiro',
      'cartao_debito': 'Cartão Débito',
      'cartao_credito': 'Cartão Crédito',
      'outros': 'Outros'
    };
    cellForma.value = pagMap[v.forma_pagamento || ''] || v.forma_pagamento || 'Não Identificado';
    cellForma.alignment = { horizontal: 'center', vertical: 'middle' };

    // 5. Faturamento
    const cellFat = rowObj.getCell(5);
    cellFat.value = faturamento;
    cellFat.numFmt = 'R$ #,##0.00';
    cellFat.alignment = { horizontal: 'right', vertical: 'middle' };

    // 6. CMV
    const cellCmv = rowObj.getCell(6);
    cellCmv.value = custoVar;
    cellCmv.numFmt = 'R$ #,##0.00';
    cellCmv.font = { color: { argb: 'FFB91C1C' } };
    cellCmv.alignment = { horizontal: 'right', vertical: 'middle' };

    // 7. Custo Fixo
    const cellFixo = rowObj.getCell(7);
    cellFixo.value = custoFixoDaVenda;
    cellFixo.numFmt = 'R$ #,##0.00';
    cellFixo.font = { color: { argb: 'FFD97706' } };
    cellFixo.alignment = { horizontal: 'right', vertical: 'middle' };

    // 8. Lucro Líquido Real (Fórmula do Excel: Fat - CMV - CustoFixo)
    const cellLucro = rowObj.getCell(8);
    cellLucro.value = { formula: `E${currentRow}-F${currentRow}-G${currentRow}`, result: faturamento - custoVar - custoFixoDaVenda };
    cellLucro.numFmt = 'R$ #,##0.00';
    cellLucro.font = { bold: true, color: { argb: 'FF15803D' } };
    cellLucro.alignment = { horizontal: 'right', vertical: 'middle' };

    // 9. Margem Real % (Fórmula: Lucro / Fat)
    const cellMargem = rowObj.getCell(9);
    cellMargem.value = { formula: `IF(E${currentRow}>0, H${currentRow}/E${currentRow}, 0)`, result: faturamento > 0 ? (faturamento - custoVar - custoFixoDaVenda) / faturamento : 0 };
    cellMargem.numFmt = '0.0%';
    cellMargem.alignment = { horizontal: 'center', vertical: 'middle' };

    // Aplicar fundos e bordas leves
    for (let c = 1; c <= 9; c++) {
      const cObj = rowObj.getCell(c);
      cObj.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBgColor } };
      cObj.border = {
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };
    }

    currentRow++;
  });

  // 9. Linha de TOTAIS CONSOLIDADOS (com Fórmulas SUM)
  const totalRow = currentRow;
  const rowTotalObj = wsDRE.getRow(totalRow);
  rowTotalObj.height = 26;

  rowTotalObj.getCell(1).value = 'TOTAIS CONSOLIDADOS';
  rowTotalObj.getCell(1).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0F172A' } };
  rowTotalObj.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

  rowTotalObj.getCell(2).value = `${vendas.length} vendas`;
  rowTotalObj.getCell(2).font = { bold: true, color: { argb: 'FF475569' } };
  rowTotalObj.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };

  rowTotalObj.getCell(3).value = '-';
  rowTotalObj.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };

  rowTotalObj.getCell(4).value = '-';
  rowTotalObj.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };

  // Soma Faturamento
  const sumFat = rowTotalObj.getCell(5);
  sumFat.value = { formula: `SUM(E${headerRow + 1}:E${totalRow - 1})`, result: totalReceita };
  sumFat.numFmt = 'R$ #,##0.00';
  sumFat.font = { bold: true, color: { argb: 'FF1E293B' } };
  sumFat.alignment = { horizontal: 'right', vertical: 'middle' };

  // Soma CMV
  const sumCmv = rowTotalObj.getCell(6);
  sumCmv.value = { formula: `SUM(F${headerRow + 1}:F${totalRow - 1})`, result: totalCmv };
  sumCmv.numFmt = 'R$ #,##0.00';
  sumCmv.font = { bold: true, color: { argb: 'FFB91C1C' } };
  sumCmv.alignment = { horizontal: 'right', vertical: 'middle' };

  // Soma Custo Fixo
  const sumFixo = rowTotalObj.getCell(7);
  sumFixo.value = { formula: `SUM(G${headerRow + 1}:G${totalRow - 1})`, result: totalCustoFixo };
  sumFixo.numFmt = 'R$ #,##0.00';
  sumFixo.font = { bold: true, color: { argb: 'FFD97706' } };
  sumFixo.alignment = { horizontal: 'right', vertical: 'middle' };

  // Soma Lucro
  const sumLucro = rowTotalObj.getCell(8);
  sumLucro.value = { formula: `SUM(H${headerRow + 1}:H${totalRow - 1})`, result: totalLucroLiquido };
  sumLucro.numFmt = 'R$ #,##0.00';
  sumLucro.font = { bold: true, color: { argb: 'FF15803D' } };
  sumLucro.alignment = { horizontal: 'right', vertical: 'middle' };

  // Margem Média Consolidada
  const sumMargem = rowTotalObj.getCell(9);
  sumMargem.value = { formula: `IF(E${totalRow}>0, H${totalRow}/E${totalRow}, 0)`, result: margemLiquidaPct };
  sumMargem.numFmt = '0.0%';
  sumMargem.font = { bold: true, color: { argb: 'FF0F172A' } };
  sumMargem.alignment = { horizontal: 'center', vertical: 'middle' };

  for (let c = 1; c <= 9; c++) {
    const cObj = rowTotalObj.getCell(c);
    cObj.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    cObj.border = {
      top: { style: 'medium', color: { argb: 'FF0F172A' } },
      bottom: { style: 'double', color: { argb: 'FF0F172A' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
    };
  }

  // ==========================================
  // ABA 2: CMV & FICHAS TÉCNICAS (BOM)
  // ==========================================
  const wsCMV = workbook.addWorksheet('Produtos & Fichas Técnicas', {
    views: [{ showGridLines: true }]
  });

  wsCMV.columns = [
    { key: 'pNome', width: 28 },
    { key: 'pPreco', width: 18 },
    { key: 'pCusto', width: 20 },
    { key: 'pLucro', width: 20 },
    { key: 'pMargem', width: 16 },
    { key: 'pIngredientes', width: 45 },
    { key: 'pStatus', width: 22 },
  ];

  wsCMV.mergeCells('A1:G1');
  const cmvHeader = wsCMV.getCell('A1');
  cmvHeader.value = 'ANÁLISE DE CUSTOS DE PRODUÇÃO E FICHAS TÉCNICAS (CMV)';
  cmvHeader.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  cmvHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF047857' } };
  cmvHeader.alignment = { horizontal: 'center', vertical: 'middle' };
  wsCMV.getRow(1).height = 32;

  const cmvColHeaders = ['Produto', 'Preço de Venda', 'Custo Produção', 'Lucro Bruto', 'Margem (%)', 'Composição (Insumos)', 'Status Margem'];
  const cmvHeadRow = wsCMV.getRow(2);
  cmvHeadRow.height = 24;
  cmvColHeaders.forEach((h, i) => {
    const c = cmvHeadRow.getCell(i + 1);
    c.value = h;
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF065F46' } };
    c.alignment = { horizontal: i === 0 || i === 5 ? 'left' : 'center', vertical: 'middle' };
    c.border = { bottom: { style: 'medium', color: { argb: 'FF022C22' } } };
  });

  let rCMV = 3;
  produtos.forEach((prod, idx) => {
    const fichasProd = fichas.filter(f => f.produto_id === prod.id);
    let custo = 0;
    const nomesInsumos: string[] = [];

    if (fichasProd.length === 0) {
      custo = prod.custo || 0;
      nomesInsumos.push('Custo base cadastrado');
    } else {
      fichasProd.forEach(f => {
        const ins = insumos.find(i => i.id === f.insumo_id);
        if (ins) {
          custo += (ins.preco_custo * f.quantidade_utilizada);
          nomesInsumos.push(`${ins.nome} (${f.quantidade_utilizada} ${ins.unidade_medida})`);
        }
      });
    }

    const lucro = prod.preco - custo;
    const margem = prod.preco > 0 ? (lucro / prod.preco) : 0;
    const emRisco = margem < 0.50;

    const row = wsCMV.getRow(rCMV);
    row.height = 20;

    row.getCell(1).value = prod.nome;
    row.getCell(1).font = { bold: true };

    row.getCell(2).value = prod.preco;
    row.getCell(2).numFmt = 'R$ #,##0.00';

    row.getCell(3).value = custo;
    row.getCell(3).numFmt = 'R$ #,##0.00';
    row.getCell(3).font = { color: { argb: 'FFDC2626' } };

    row.getCell(4).value = lucro;
    row.getCell(4).numFmt = 'R$ #,##0.00';
    row.getCell(4).font = { color: { argb: 'FF16A34A' }, bold: true };

    row.getCell(5).value = margem;
    row.getCell(5).numFmt = '0.0%';

    row.getCell(6).value = nomesInsumos.join(' + ');

    row.getCell(7).value = emRisco ? 'ALERTA: < 50%' : 'Saudável (>= 50%)';
    row.getCell(7).font = { color: { argb: emRisco ? 'FFB91C1C' : 'FF15803D' }, bold: true };

    for (let c = 1; c <= 7; c++) {
      const cell = row.getCell(c);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: idx % 2 === 1 ? 'FFF0FDF4' : 'FFFFFFFF' } };
      cell.border = { bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } } };
    }
    rCMV++;
  });

  // ==========================================
  // ABA 3: INSUMOS & ESTOQUE
  // ==========================================
  const wsInsumos = workbook.addWorksheet('Insumos & Fornecedores', {
    views: [{ showGridLines: true }]
  });

  wsInsumos.columns = [
    { key: 'iNome', width: 32 },
    { key: 'iUnidade', width: 12 },
    { key: 'iPreco', width: 18 },
    { key: 'iEstoque', width: 16 },
    { key: 'iMinimo', width: 16 },
    { key: 'iTotal', width: 22 },
    { key: 'iForn', width: 32 },
    { key: 'iStatus', width: 20 }
  ];

  wsInsumos.mergeCells('A1:H1');
  const insHeader = wsInsumos.getCell('A1');
  insHeader.value = 'CADASTRO DE INSUMOS, ESTOQUE E FORNECEDORES';
  insHeader.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  insHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4338CA' } };
  insHeader.alignment = { horizontal: 'center', vertical: 'middle' };
  wsInsumos.getRow(1).height = 32;

  const insColHeaders = ['Insumo', 'Unidade', 'Preço Custo', 'Estoque Atual', 'Estoque Mínimo', 'Valor em Estoque', 'Fornecedor', 'Status Reposição'];
  const insHeadRow = wsInsumos.getRow(2);
  insHeadRow.height = 24;
  insColHeaders.forEach((h, i) => {
    const c = insHeadRow.getCell(i + 1);
    c.value = h;
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3730A3' } };
    c.alignment = { horizontal: i === 0 || i === 6 ? 'left' : 'center', vertical: 'middle' };
  });

  let rIns = 3;
  insumos.forEach((ins, idx) => {
    const forn = fornecedores.find(f => f.id === ins.fornecedor_id);
    const emFalta = (ins.quantidade_estoque || 0) <= (ins.estoque_minimo || 0);

    const row = wsInsumos.getRow(rIns);
    row.height = 20;

    row.getCell(1).value = ins.nome;
    row.getCell(1).font = { bold: true };
    row.getCell(2).value = ins.unidade_medida;
    row.getCell(3).value = ins.preco_custo;
    row.getCell(3).numFmt = 'R$ #,##0.00';

    row.getCell(4).value = ins.quantidade_estoque || 0;
    row.getCell(5).value = ins.estoque_minimo || 0;

    row.getCell(6).value = { formula: `C${rIns}*D${rIns}`, result: (ins.preco_custo || 0) * (ins.quantidade_estoque || 0) };
    row.getCell(6).numFmt = 'R$ #,##0.00';

    row.getCell(7).value = forn ? `${forn.nome_empresa} (${forn.cidade || ''})` : 'Sem fornecedor';
    row.getCell(8).value = emFalta ? 'COMPRAR URGENTE' : 'Estoque Regular';
    row.getCell(8).font = { color: { argb: emFalta ? 'FFDC2626' : 'FF16A34A' }, bold: true };

    for (let c = 1; c <= 8; c++) {
      const cell = row.getCell(c);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: idx % 2 === 1 ? 'FFEEF2FF' : 'FFFFFFFF' } };
      cell.border = { bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } } };
    }
    rIns++;
  });

  // ==========================================
  // DISPARAR DOWNLOAD NO NAVEGADOR (.XLSX)
  // ==========================================
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeFiltro = filtroNome.toLowerCase().replace(/\s+/g, '_');
  a.download = `relatorio_dre_panificadora_${safeFiltro}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

/**
 * Exportador CSV otimizado para o Excel em Português (Brasil),
 * usando ponto e vírgula (;) como separador e UTF-8 BOM para evitar desconfiguração.
 */
export function exportarRelatorioCSVFormatado(vendas: Compra[], custosConfig: CustosFixosConfig, filtroNome: string): void {
  const BOM = '\uFEFF';
  const lines: string[] = [
    'Data da Venda;Hora;Produtos Vendidos;Forma de Pagamento;Faturamento Bruto (R$);CMV Insumos (R$);Custo Fixo Rateado (R$);Lucro Líquido Real (R$);Margem Real (%)'
  ];

  let diasNoFiltro = 30;
  if (filtroNome === 'Hoje') diasNoFiltro = 1;
  else if (filtroNome === '7 Dias') diasNoFiltro = 7;

  const totalReceita = vendas.reduce((acc, v) => acc + (v.valor || 0), 0);
  let totalCustoFixo = 0;
  if (custosConfig.tipo === 'mensal') {
    totalCustoFixo = (custosConfig.valor / 30) * diasNoFiltro;
  } else {
    totalCustoFixo = totalReceita * (custosConfig.valor / 100);
  }

  const countVendas = vendas.length;
  const custoFixoPorVenda = countVendas > 0 ? (totalCustoFixo / countVendas) : 0;

  vendas.forEach(c => {
    const faturamento = c.valor || 0;
    const custoVar = c.custo_total || 0;
    
    let custoFixoDaVenda = 0;
    if (custosConfig.tipo === 'mensal') {
      custoFixoDaVenda = custoFixoPorVenda;
    } else {
      custoFixoDaVenda = faturamento * (custosConfig.valor / 100);
    }
    
    const lucroLiquido = faturamento - custoVar - custoFixoDaVenda;
    const margem = faturamento > 0 ? ((lucroLiquido / faturamento) * 100).toFixed(1) : '0.0';

    // No padrão brasileiro do Excel, decimais usam vírgula
    const fmt = (num: number) => num.toFixed(2).replace('.', ',');

    let horaStr = '--:--';
    if (c.criado_em) {
      try {
        const d = new Date(c.criado_em);
        if (!isNaN(d.getTime())) {
          horaStr = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        }
      } catch {
        // fallback
      }
    }

    const prodsStr = (c.detalhes || 'Venda no Caixa (Geral)').replace(/;/g, ',');

    lines.push(`${c.data_compra || ''};${horaStr};${prodsStr};${c.forma_pagamento || 'Geral'};${fmt(faturamento)};${fmt(custoVar)};${fmt(custoFixoDaVenda)};${fmt(lucroLiquido)};${margem}%`);
  });

  const csvContent = BOM + lines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `relatorio_dre_${filtroNome.toLowerCase().replace(/\s+/g, '_')}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

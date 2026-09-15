const fs = require('fs');
let code = fs.readFileSync('src/services/db.ts', 'utf8');
code = code.replace(/export async function registerCompra\(\n  clienteId: string, \n  valor: number, \n  pontuouFidelidade: boolean,\n  detalhes\?: string \| null\n\): Promise<Compra> \{/,
"export async function registerCompra(\n  clienteId: string, \n  valor: number, \n  pontuouFidelidade: boolean,\n  detalhes?: string | null,\n  carrinho?: any[],\n  forma_pagamento?: string\n): Promise<Compra> {");
fs.writeFileSync('src/services/db.ts', code);

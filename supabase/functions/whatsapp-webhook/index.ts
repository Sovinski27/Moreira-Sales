import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    console.log("Received webhook payload.");

    // Handle Evolution API Webhook format
    const data = payload?.data || payload;
    const fromMe = data?.key?.fromMe;
    if (fromMe) {
        return new Response(JSON.stringify({ message: "Ignored message from self" }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });
    }

    const text = data?.message?.conversation || data?.message?.extendedTextMessage?.text || data?.text || "";
    if (!text) {
        return new Response(JSON.stringify({ message: "No text found" }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });
    }

    const rawPhone = data?.key?.remoteJid || data?.remoteJid || "";
    const phone = rawPhone.split('@')[0];
    const name = data?.pushName || payload?.sender?.name || 'Cliente WhatsApp';

    console.log(`Message from ${name} (${phone}): ${text}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Fetch available products
    const { data: produtos, error: produtosError } = await supabase
      .from('produtos')
      .select('id, nome, preco')
      .eq('ativo', true);

    if (produtosError) {
      throw new Error(`Error fetching products: ${produtosError.message}`);
    }

    if (!produtos || produtos.length === 0) {
      return new Response(JSON.stringify({ message: "Nenhum produto cadastrado." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const produtosList = produtos.map((p: any) => `- ID: ${p.id} | Nome: ${p.nome} | Preço: R$${p.preco}`).join('\n');

    // 2. Call Gemini to parse intent
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
        throw new Error("GEMINI_API_KEY not set");
    }

    const prompt = `
Você é um assistente de padaria. O cliente enviou a seguinte mensagem no WhatsApp:
"${text}"

Nós temos os seguintes produtos disponíveis:
${produtosList}

Se a mensagem for um pedido de produtos, extraia os itens e retorne um JSON estrito no seguinte formato:
\`\`\`json
{
  "is_pedido": true,
  "itens": [
    { "produto_id": "UUID-DO-PRODUTO", "quantidade": 1 }
  ],
  "observacoes": "Alguma observação do cliente, ex: bem passado"
}
\`\`\`
IMPORTANTE: Use APENAS os UUIDs da lista fornecida. Associe os produtos do pedido aos itens da lista da melhor forma possível.

Se a mensagem NÃO for um pedido (ex: apenas "bom dia", "qual o horário de funcionamento?"), retorne:
\`\`\`json
{
  "is_pedido": false,
  "resposta_sugerida": "Resposta amigável para enviar ao cliente"
}
\`\`\`

Responda APENAS com o JSON válido, sem mais nenhum texto. Não use markdown na resposta, apenas o JSON puro.
`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;
    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.1,
        }
      }),
    });

    if (!geminiResponse.ok) {
        const errText = await geminiResponse.text();
        throw new Error(`Gemini API error: ${geminiResponse.status} ${errText}`);
    }

    const geminiData = await geminiResponse.json();
    let resultText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    
    // Clean markdown if present
    resultText = resultText.replace(/```json/gi, '').replace(/```/g, '').trim();
    
    let parsedIntent;
    try {
        parsedIntent = JSON.parse(resultText);
    } catch(e) {
        console.error("Failed to parse Gemini output:", resultText);
        throw new Error("Invalid JSON from Gemini");
    }

    if (!parsedIntent.is_pedido || !parsedIntent.itens || !Array.isArray(parsedIntent.itens) || parsedIntent.itens.length === 0) {
        console.log("Not a valid order, ignoring or handling differently.", parsedIntent);
        return new Response(JSON.stringify({ message: "Not a valid order", data: parsedIntent }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });
    }

    // 3. Prepare order items robustly from database values
    let valor_total = 0;
    const finalItems = [];

    for (const item of parsedIntent.itens) {
        const produto = produtos.find((p: any) => p.id === item.produto_id);
        if (produto) {
            const quantidade = Number(item.quantidade) || 1;
            const preco_unitario = Number(produto.preco) || 0;
            const subtotal = quantidade * preco_unitario;
            valor_total += subtotal;
            
            finalItems.push({
                produto_id: produto.id,
                quantidade: quantidade,
                preco_unitario: preco_unitario,
                subtotal: subtotal
            });
        }
    }

    if (finalItems.length === 0) {
        console.log("No valid products matched from intent:", parsedIntent.itens);
        return new Response(JSON.stringify({ message: "Nenhum produto válido encontrado no pedido." }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });
    }

    // 4. Check if customer exists
    let cliente_id = null;
    const { data: clienteData } = await supabase
        .from('clientes')
        .select('id')
        .eq('whatsapp', phone)
        .maybeSingle();
        
    if (clienteData) {
        cliente_id = clienteData.id;
    }

    // 5. Create Pedido
    const { data: pedidoData, error: pedidoError } = await supabase
        .from('pedidos')
        .insert({
            cliente_id,
            origem: 'WhatsApp',
            identificador_origem: phone,
            status: 'Pendente',
            valor_total: valor_total,
            observacoes: parsedIntent.observacoes || '',
            cliente_nome: name,
            cliente_whatsapp: phone
        })
        .select()
        .single();

    if (pedidoError) throw new Error(`Error creating pedido: ${pedidoError.message}`);

    // 6. Create Items
    const itensToInsert = finalItems.map(item => ({
        ...item,
        pedido_id: pedidoData.id
    }));

    const { error: itensError } = await supabase
        .from('itens_pedido')
        .insert(itensToInsert);

    if (itensError) throw new Error(`Error creating itens_pedido: ${itensError.message}`);

    console.log(`Pedido ${pedidoData.id} created successfully!`);

    return new Response(JSON.stringify({ success: true, pedido_id: pedidoData.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});

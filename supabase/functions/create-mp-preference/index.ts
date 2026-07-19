// Edge Function: create-mp-preference
//
// Cria uma "preferência de pagamento" no Mercado Pago e devolve o link do
// checkout. Roda no servidor do Supabase, nunca no celular do cliente —
// é o único lugar onde o Access Token (chave secreta) do Mercado Pago é
// usado, então ele nunca fica exposto no código do app.

import { serve } from "https://deno.land/std@0.192.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { orderId, orderNumber, items, customerEmail } = await req.json();

    const accessToken = Deno.env.get("MP_ACCESS_TOKEN");
    if (!accessToken) {
      throw new Error("MP_ACCESS_TOKEN não configurado nas secrets do Supabase.");
    }

    const preference = {
      items: items.map((item) => ({
        title: item.product_name,
        quantity: item.quantity,
        unit_price: Number(item.unit_price),
        currency_id: "BRL",
      })),
      payer: customerEmail ? { email: customerEmail } : undefined,
      external_reference: orderId,
      statement_descriptor: `Pedido ${orderNumber}`,
    };

    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(preference),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Erro ao criar preferência no Mercado Pago.");
    }

    return new Response(
      JSON.stringify({ checkoutUrl: data.init_point, preferenceId: data.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

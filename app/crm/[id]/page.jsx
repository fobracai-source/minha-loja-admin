"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AuthGate from "../../../components/AuthGate";
import Sidebar from "../../../components/Sidebar";
import { supabase } from "../../../lib/supabaseClient";
import {
  Phone, Mail, ArrowLeft, Trash2, MapPin, CreditCard, TrendingUp, Calendar,
  Package, Repeat, Award, AlertTriangle, ChevronDown, ChevronUp, Headphones,
} from "lucide-react";

const STAGES = [
  { id: "lead", label: "Lead" },
  { id: "contato_feito", label: "Contato Feito" },
  { id: "negociacao", label: "Negociação" },
  { id: "cliente", label: "Cliente" },
];

const INTERACTION_TYPES = [
  { id: "ligacao", label: "Ligação" },
  { id: "email", label: "E-mail" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "reuniao", label: "Reunião" },
  { id: "outro", label: "Outro" },
];

const PAYMENT_METHOD_LABELS = {
  cod: "Pagar na Entrega",
  mercadopago: "Mercado Pago",
  stripe: "Cartão de Crédito",
  pagbank: "PagBank",
};

function fmtMoney(v) {
  return `R$ ${Number(v || 0).toFixed(2).replace(".", ",")}`;
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
}

function normalizarTelefone(tel) {
  return (tel || "").replace(/\D/g, "").slice(-11);
}

function formaPagamentoMaisUsada(orders) {
  if (!orders || orders.length === 0) return null;
  const contagem = {};
  orders.forEach((o) => { contagem[o.payment_method] = (contagem[o.payment_method] || 0) + 1; });
  const [maisUsada] = Object.entries(contagem).sort((a, b) => b[1] - a[1]);
  return maisUsada ? { id: maisUsada[0], vezes: maisUsada[1] } : null;
}

// Junta os itens de todos os pedidos e soma quantidade por produto
function produtosFavoritos(orders) {
  const contagem = {};
  orders.forEach((o) => {
    (o.order_items || []).forEach((item) => {
      if (!contagem[item.product_name]) contagem[item.product_name] = { nome: item.product_name, quantidade: 0, vezesComprado: 0, totalGasto: 0 };
      contagem[item.product_name].quantidade += item.quantity;
      contagem[item.product_name].vezesComprado += 1;
      contagem[item.product_name].totalGasto += Number(item.unit_price) * item.quantity;
    });
  });
  return Object.values(contagem).sort((a, b) => b.quantidade - a.quantidade);
}

// Média de dias entre um pedido e o seguinte, em ordem cronológica
function calcularPeriodicidade(orders) {
  if (orders.length < 2) return null;
  const datas = orders.map((o) => new Date(o.created_at)).sort((a, b) => a - b);
  let somaDias = 0;
  for (let i = 1; i < datas.length; i++) {
    somaDias += (datas[i] - datas[i - 1]) / (1000 * 60 * 60 * 24);
  }
  return Math.round(somaDias / (datas.length - 1));
}

// Classificação simples de perfil do cliente (o que costuma se chamar de análise RFM)
function classificarCliente(pedidos, diasDesdeUltimaCompra, totalGasto, periodicidade) {
  if (pedidos === 0) return { label: "Sem compras ainda", color: "#a3a3a3", bg: "#f5f5f5", icon: null };
  if (pedidos === 1) return { label: "Cliente novo", color: "#2563eb", bg: "#eff6ff", icon: Package };
  if (totalGasto >= 500 && pedidos >= 4) return { label: "Cliente VIP", color: "#a16207", bg: "#fef9c3", icon: Award };
  if (periodicidade && diasDesdeUltimaCompra > periodicidade * 2.5) {
    return { label: "Em risco de perda", color: "#dc2626", bg: "#fef2f2", icon: AlertTriangle };
  }
  return { label: "Cliente fiel", color: "#16a34a", bg: "#f0fdf4", icon: Repeat };
}

function CustomerDetailContent() {
  const { id } = useParams();
  const router = useRouter();
  const [customer, setCustomer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [interactions, setInteractions] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState(null);

  const [newType, setNewType] = useState("ligacao");
  const [newDescription, setNewDescription] = useState("");

  async function loadAll() {
    setLoading(true);
    const [{ data: customerData }, { data: orderData }, { data: interactionData }] = await Promise.all([
      supabase.from("customers").select("*").eq("id", id).single(),
      supabase.from("orders").select("*, order_items(product_name, unit_price, quantity)").eq("customer_id", id).order("created_at", { ascending: false }),
      supabase.from("interactions").select("*").eq("customer_id", id).order("created_at", { ascending: false }),
    ]);
    setCustomer(customerData);
    setOrders(orderData || []);
    setInteractions(interactionData || []);

    if (customerData?.phone) {
      const tel = normalizarTelefone(customerData.phone);
      const { data: allTickets } = await supabase.from("support_tickets").select("id, subject, status, priority, created_at, customer_phone");
      setTickets((allTickets || []).filter((t) => normalizarTelefone(t.customer_phone) === tel));
    }

    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleStageChange(stage) {
    await supabase.from("customers").update({ stage }).eq("id", id);
    setCustomer((c) => ({ ...c, stage }));
  }

  async function handleAddInteraction(e) {
    e.preventDefault();
    if (!newDescription.trim()) return;
    await supabase.from("interactions").insert({
      customer_id: id,
      type: newType,
      description: newDescription,
    });
    setNewDescription("");
    loadAll();
  }

  async function handleDeleteInteraction(interactionId) {
    await supabase.from("interactions").delete().eq("id", interactionId);
    loadAll();
  }

  if (loading) {
    return (
      <div>
        <Sidebar />
        <div style={styles.content}><p style={{ color: "#a3a3a3" }}>Carregando…</p></div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div>
        <Sidebar />
        <div style={styles.content}><p style={{ color: "#a3a3a3" }}>Cliente não encontrado.</p></div>
      </div>
    );
  }

  const totalGasto = orders.reduce((sum, o) => sum + Number(o.total), 0);
  const ticketMedio = orders.length > 0 ? totalGasto / orders.length : 0;
  const ultimaCompra = orders.length > 0 ? orders[0].created_at : null;
  const diasDesdeUltimaCompra = ultimaCompra ? Math.round((Date.now() - new Date(ultimaCompra)) / (1000 * 60 * 60 * 24)) : null;
  const pagamentoPreferido = formaPagamentoMaisUsada(orders);
  const periodicidade = calcularPeriodicidade(orders);
  const favoritos = produtosFavoritos(orders);
  const perfil = classificarCliente(orders.length, diasDesdeUltimaCompra ?? 9999, totalGasto, periodicidade);
  const PerfilIcon = perfil.icon;

  const temEnderecoEstruturado = customer.street || customer.city;

  return (
    <div>
      <Sidebar />
      <div style={styles.content}>
        <button onClick={() => router.push("/crm")} style={styles.backButton}>
          <ArrowLeft size={14} /> Voltar ao CRM
        </button>

        <div style={styles.headerCard}>
          <div>
            <div style={styles.nameRow}>
              <h1 style={styles.title}>{customer.name}</h1>
              <span style={{ ...styles.perfilBadge, color: perfil.color, background: perfil.bg }}>
                {PerfilIcon && <PerfilIcon size={12} />} {perfil.label}
              </span>
            </div>
            <div style={styles.contactRow}>
              {customer.email && <span style={styles.contactItem}><Mail size={13} /> {customer.email}</span>}
              {customer.phone && <span style={styles.contactItem}><Phone size={13} /> {customer.phone}</span>}
            </div>
          </div>
          <select
            value={customer.stage}
            onChange={(e) => handleStageChange(e.target.value)}
            style={styles.stageSelect}
          >
            {STAGES.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>

        {/* ── Perfil de consumo ── */}
        <h2 style={styles.blockTitle}>Perfil de consumo</h2>
        <div style={styles.statsRow}>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{orders.length}</div>
            <div style={styles.statLabel}>Pedidos realizados</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{fmtMoney(totalGasto)}</div>
            <div style={styles.statLabel}>Total gasto (LTV)</div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statValue, display: "flex", alignItems: "center", gap: 5 }}>
              <TrendingUp size={14} color="#16a34a" /> {fmtMoney(ticketMedio)}
            </div>
            <div style={styles.statLabel}>Ticket médio</div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statValue, display: "flex", alignItems: "center", gap: 5 }}>
              <Calendar size={14} color="#525252" /> {fmtDate(ultimaCompra)}
            </div>
            <div style={styles.statLabel}>
              Última compra {diasDesdeUltimaCompra !== null && `(${diasDesdeUltimaCompra}d atrás)`}
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statValue, display: "flex", alignItems: "center", gap: 5 }}>
              <Repeat size={14} color="#2563eb" /> {periodicidade ? `${periodicidade} dias` : "—"}
            </div>
            <div style={styles.statLabel}>Periodicidade de compra</div>
          </div>
        </div>

        <div style={styles.infoCardsRow}>
          <div style={styles.infoCard}>
            <div style={styles.infoCardHeader}><MapPin size={14} color="#525252" /> Endereço</div>
            {temEnderecoEstruturado ? (
              <>
                <p style={styles.infoCardText}>
                  {[customer.street, customer.street_number].filter(Boolean).join(", ")}
                  {customer.complement ? ` — ${customer.complement}` : ""}
                </p>
                <p style={styles.infoCardText}>{customer.neighborhood}</p>
                <p style={styles.infoCardText}>
                  {[customer.city, customer.state].filter(Boolean).join(" - ")} {customer.zip_code ? `· CEP ${customer.zip_code}` : ""}
                </p>
                {customer.reference_point && <p style={styles.infoCardTextMuted}>Referência: {customer.reference_point}</p>}
              </>
            ) : customer.address ? (
              <p style={styles.infoCardText}>{customer.address}</p>
            ) : (
              <p style={styles.infoCardTextMuted}>Nenhum endereço cadastrado ainda.</p>
            )}
          </div>

          <div style={styles.infoCard}>
            <div style={styles.infoCardHeader}><CreditCard size={14} color="#525252" /> Forma de pagamento preferida</div>
            {pagamentoPreferido ? (
              <>
                <p style={styles.infoCardText}>{PAYMENT_METHOD_LABELS[pagamentoPreferido.id] || pagamentoPreferido.id}</p>
                <p style={styles.infoCardTextMuted}>Usada em {pagamentoPreferido.vezes} de {orders.length} pedido(s)</p>
              </>
            ) : (
              <p style={styles.infoCardTextMuted}>Ainda sem pedidos suficientes.</p>
            )}
          </div>

          <div style={styles.infoCard}>
            <div style={styles.infoCardHeader}><Headphones size={14} color="#525252" /> Atendimento (SAC)</div>
            <p style={styles.infoCardText}>{tickets.length} chamado(s) registrado(s)</p>
            {tickets.length > 0 && (
              <p style={styles.infoCardTextMuted}>
                {tickets.filter((t) => t.status === "aberto" || t.status === "em_andamento").length} em aberto
              </p>
            )}
          </div>
        </div>

        {/* ── Produtos favoritos ── */}
        <h2 style={styles.blockTitle}>Produtos que o cliente compra</h2>
        {favoritos.length === 0 ? (
          <p style={styles.empty}>Nenhuma compra registrada ainda.</p>
        ) : (
          <div style={styles.favoritosList}>
            {favoritos.slice(0, 5).map((p, i) => (
              <div key={p.nome} style={styles.favoritoRow}>
                <span style={styles.favoritoRank}>{i + 1}º</span>
                <span style={styles.favoritoNome}>{p.nome}</span>
                <span style={styles.favoritoQtd}>{p.quantidade}x compradas · {p.vezesComprado} pedido(s)</span>
                <span style={styles.favoritoValor}>{fmtMoney(p.totalGasto)}</span>
              </div>
            ))}
          </div>
        )}

        <div style={styles.grid}>
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Histórico de compras (clique para ver os itens)</h2>
            {orders.length === 0 ? (
              <p style={styles.empty}>Nenhum pedido ainda.</p>
            ) : (
              orders.map((o) => (
                <div key={o.id}>
                  <button onClick={() => setExpandedOrder(expandedOrder === o.id ? null : o.id)} style={styles.orderRowButton}>
                    <span>#{o.order_number}</span>
                    <span>{fmtDate(o.created_at)}</span>
                    <span>{o.status}</span>
                    <span style={{ fontWeight: 700 }}>{fmtMoney(o.total)}</span>
                    {expandedOrder === o.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  {expandedOrder === o.id && (
                    <div style={styles.orderItemsBox}>
                      {(o.order_items || []).map((item, idx) => (
                        <div key={idx} style={styles.orderItemRow}>
                          <span>{item.quantity}x {item.product_name}</span>
                          <span>{fmtMoney(item.unit_price * item.quantity)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Interações</h2>

            <form onSubmit={handleAddInteraction} style={styles.interactionForm}>
              <select value={newType} onChange={(e) => setNewType(e.target.value)} style={styles.typeSelect}>
                {INTERACTION_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
              <input
                placeholder="O que foi conversado?"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                style={styles.interactionInput}
              />
              <button type="submit" style={styles.addButton}>Registrar</button>
            </form>

            {interactions.length === 0 ? (
              <p style={styles.empty}>Nenhuma interação registrada ainda.</p>
            ) : (
              <div style={styles.timeline}>
                {interactions.map((i) => (
                  <div key={i.id} style={styles.timelineItem}>
                    <div style={styles.timelineHeader}>
                      <span style={styles.timelineType}>{INTERACTION_TYPES.find((t) => t.id === i.type)?.label || i.type}</span>
                      <span style={styles.timelineDate}>{new Date(i.created_at).toLocaleString("pt-BR")}</span>
                      <button onClick={() => handleDeleteInteraction(i.id)} style={styles.deleteButton}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <p style={styles.timelineDescription}>{i.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CustomerDetailPage() {
  return (
    <AuthGate>
      <CustomerDetailContent />
    </AuthGate>
  );
}

const styles = {
  content: { padding: "24px 20px", maxWidth: 1100, margin: "0 auto" },
  backButton: {
    display: "flex", alignItems: "center", gap: 6, background: "none", border: "none",
    color: "#737373", fontSize: 13, cursor: "pointer", marginBottom: 12, padding: 0,
  },
  headerCard: {
    display: "flex", justifyContent: "space-between", alignItems: "flex-start",
    flexWrap: "wrap", gap: 12, marginBottom: 20,
  },
  nameRow: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },
  title: { fontSize: 22, fontWeight: 700, margin: 0 },
  perfilBadge: { display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999 },
  contactRow: { display: "flex", gap: 14, marginTop: 4, flexWrap: "wrap" },
  contactItem: { display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#737373" },
  stageSelect: { border: "1px solid #e5e5e5", borderRadius: 10, padding: "8px 12px", fontSize: 13, fontWeight: 600 },
  blockTitle: { fontSize: 13, fontWeight: 700, color: "#525252", textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 8, marginTop: 22 },
  statsRow: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 14 },
  statCard: { background: "#fff", border: "1px solid #e5e5e5", borderRadius: 12, padding: "12px 16px" },
  statValue: { fontSize: 16, fontWeight: 700 },
  statLabel: { fontSize: 11, color: "#737373", marginTop: 2 },
  infoCardsRow: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 10 },
  infoCard: { background: "#fafafa", border: "1px solid #e5e5e5", borderRadius: 12, padding: 14 },
  infoCardHeader: { display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "#525252", marginBottom: 6 },
  infoCardText: { fontSize: 12.5, color: "#171717", margin: "1px 0" },
  infoCardTextMuted: { fontSize: 11.5, color: "#a3a3a3", margin: "3px 0 0" },
  favoritosList: { display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 },
  favoritoRow: { display: "flex", alignItems: "center", gap: 10, background: "#fff", border: "1px solid #e5e5e5", borderRadius: 10, padding: "9px 14px", fontSize: 12.5 },
  favoritoRank: { fontWeight: 800, color: "#a3a3a3", width: 22 },
  favoritoNome: { fontWeight: 600, flex: 1 },
  favoritoQtd: { color: "#737373", fontSize: 11.5 },
  favoritoValor: { fontWeight: 700, color: "#16a34a" },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 10 },
  section: { background: "#fff", border: "1px solid #e5e5e5", borderRadius: 14, padding: 16 },
  sectionTitle: { fontSize: 13, fontWeight: 700, marginBottom: 10 },
  empty: { fontSize: 12, color: "#a3a3a3" },
  orderRowButton: {
    display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12,
    padding: "8px 0", borderBottom: "1px solid #f5f5f5", width: "100%", background: "none", border: "none",
    borderBottomStyle: "solid", borderBottomWidth: 1, borderBottomColor: "#f5f5f5", cursor: "pointer", textAlign: "left",
  },
  orderItemsBox: { background: "#fafafa", borderRadius: 8, padding: "8px 12px", margin: "4px 0 8px" },
  orderItemRow: { display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "#525252", padding: "3px 0" },
  interactionForm: { display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 },
  typeSelect: { border: "1px solid #e5e5e5", borderRadius: 8, padding: "7px 10px", fontSize: 12 },
  interactionInput: { border: "1px solid #e5e5e5", borderRadius: 8, padding: "7px 10px", fontSize: 12 },
  addButton: {
    border: "none", background: "#171717", color: "#fff", borderRadius: 8,
    padding: "8px", fontWeight: 600, fontSize: 12, cursor: "pointer",
  },
  timeline: { display: "flex", flexDirection: "column", gap: 10 },
  timelineItem: { borderLeft: "2px solid #e5e5e5", paddingLeft: 10 },
  timelineHeader: { display: "flex", alignItems: "center", gap: 8 },
  timelineType: { fontSize: 11, fontWeight: 700, color: "#171717" },
  timelineDate: { fontSize: 10, color: "#a3a3a3", marginLeft: "auto" },
  deleteButton: { background: "none", border: "none", color: "#dc2626", cursor: "pointer", padding: 2 },
  timelineDescription: { fontSize: 12, color: "#525252", marginTop: 2 },
};

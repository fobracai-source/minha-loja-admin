"use client";

import { useEffect, useState } from "react";
import AuthGate from "../../components/AuthGate";
import Sidebar from "../../components/Sidebar";
import { supabase } from "../../lib/supabaseClient";
import { Plus, Phone, ShoppingBag, Scale, User, MapPin, Repeat, Award, AlertTriangle, Package } from "lucide-react";

const STATUSES = [
  { id: "aberto", label: "Aberto" },
  { id: "em_andamento", label: "Em Andamento" },
  { id: "resolvido", label: "Resolvido" },
  { id: "fechado", label: "Fechado" },
];

const PRIORITIES = {
  baixa: { label: "Baixa", color: "#737373", bg: "#f5f5f5" },
  media: { label: "Média", color: "#d97706", bg: "#fef3c7" },
  alta: { label: "Alta", color: "#dc2626", bg: "#fee2e2" },
};

function normalizarTelefone(tel) {
  return (tel || "").replace(/\D/g, "").slice(-11);
}

function fmtMoney(v) {
  return `R$ ${Number(v || 0).toFixed(2).replace(".", ",")}`;
}

function calcularPeriodicidade(orders) {
  if (orders.length < 2) return null;
  const datas = orders.map((o) => new Date(o.created_at)).sort((a, b) => a - b);
  let somaDias = 0;
  for (let i = 1; i < datas.length; i++) somaDias += (datas[i] - datas[i - 1]) / (1000 * 60 * 60 * 24);
  return Math.round(somaDias / (datas.length - 1));
}

function produtoFavorito(orders) {
  const contagem = {};
  orders.forEach((o) => {
    (o.order_items || []).forEach((item) => {
      contagem[item.product_name] = (contagem[item.product_name] || 0) + item.quantity;
    });
  });
  const entradas = Object.entries(contagem).sort((a, b) => b[1] - a[1]);
  return entradas[0] ? { nome: entradas[0][0], quantidade: entradas[0][1] } : null;
}

function classificarCliente(pedidos, diasDesdeUltimaCompra, totalGasto, periodicidade) {
  if (pedidos === 0) return { label: "Sem compras ainda", color: "#a3a3a3", bg: "#f5f5f5", icon: null };
  if (pedidos === 1) return { label: "Cliente novo", color: "#2563eb", bg: "#eff6ff", icon: Package };
  if (totalGasto >= 500 && pedidos >= 4) return { label: "Cliente VIP", color: "#a16207", bg: "#fef9c3", icon: Award };
  if (periodicidade && diasDesdeUltimaCompra > periodicidade * 2.5) {
    return { label: "Em risco de perda", color: "#dc2626", bg: "#fef2f2", icon: AlertTriangle };
  }
  return { label: "Cliente fiel", color: "#16a34a", bg: "#f0fdf4", icon: Repeat };
}

function SacContent() {
  const [tickets, setTickets] = useState([]);
  const [reclamacoesMap, setReclamacoesMap] = useState({});
  const [customerProfiles, setCustomerProfiles] = useState({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("aberto");
  const [showForm, setShowForm] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [buscaCliente, setBuscaCliente] = useState("");
  const [resultadosBusca, setResultadosBusca] = useState([]);
  const [buscandoCliente, setBuscandoCliente] = useState(false);
  const [clienteSelecionado, setClienteSelecionado] = useState(null);
  const [pedidosClienteSelecionado, setPedidosClienteSelecionado] = useState([]);
  const [carregandoPedidosCliente, setCarregandoPedidosCliente] = useState(false);
  const [customerPhone, setCustomerPhone] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("media");
  const [saving, setSaving] = useState(false);

  async function loadTickets() {
    setLoading(true);
    const [ticketsResult, reclamacoesResult, customersResult] = await Promise.all([
      supabase.from("support_tickets").select("*, orders(order_number)").order("created_at", { ascending: false }),
      supabase.from("juridico_reclamacoes").select("id, sac_chamado_id, canal, status").not("sac_chamado_id", "is", null),
      supabase.from("customers").select("id, phone, street, street_number, neighborhood, city, state, orders(created_at, total, order_items(product_name, quantity))"),
    ]);
    setTickets(ticketsResult.data || []);

    const map = {};
    (reclamacoesResult.data || []).forEach((r) => { map[r.sac_chamado_id] = r; });
    setReclamacoesMap(map);

    const customers = customersResult.data || [];
    const byPhone = {};
    customers.forEach((c) => {
      const tel = normalizarTelefone(c.phone);
      if (!tel) return;
      const orders = c.orders || [];
      const totalGasto = orders.reduce((s, o) => s + Number(o.total), 0);
      const ultimaCompra = orders.length > 0
        ? orders.reduce((max, o) => (new Date(o.created_at) > new Date(max) ? o.created_at : max), orders[0].created_at)
        : null;
      const diasDesdeUltimaCompra = ultimaCompra ? Math.round((Date.now() - new Date(ultimaCompra)) / (1000 * 60 * 60 * 24)) : null;
      const periodicidade = calcularPeriodicidade(orders);
      const favorito = produtoFavorito(orders);
      const perfil = classificarCliente(orders.length, diasDesdeUltimaCompra ?? 9999, totalGasto, periodicidade);

      byPhone[tel] = {
        total_pedidos: orders.length,
        total_gasto: totalGasto,
        ticket_medio: orders.length > 0 ? totalGasto / orders.length : 0,
        ultima_compra: ultimaCompra,
        periodicidade,
        favorito,
        perfil,
        endereco: [c.street, c.street_number].filter(Boolean).join(", ") +
          (c.city ? ` — ${c.neighborhood ? c.neighborhood + ", " : ""}${c.city}${c.state ? "/" + c.state : ""}` : ""),
      };
    });
    setCustomerProfiles(byPhone);

    setLoading(false);
  }

  useEffect(() => {
    loadTickets();
  }, []);

  useEffect(() => {
    if (!buscaCliente.trim()) {
      setResultadosBusca([]);
      return;
    }
    setBuscandoCliente(true);
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from("customers")
        .select("id, name, phone, email")
        .ilike("name", `%${buscaCliente.trim()}%`)
        .limit(6);
      setResultadosBusca(data || []);
      setBuscandoCliente(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [buscaCliente]);

  async function handleSelecionarCliente(cliente) {
    setClienteSelecionado(cliente);
    setCustomerName(cliente.name);
    setCustomerPhone(cliente.phone || "");
    setBuscaCliente("");
    setResultadosBusca([]);

    setCarregandoPedidosCliente(true);
    const { data } = await supabase
      .from("orders")
      .select("order_number, created_at, total, status, order_items(product_name, quantity)")
      .eq("customer_id", cliente.id)
      .order("created_at", { ascending: false })
      .limit(10);
    setPedidosClienteSelecionado(data || []);
    setCarregandoPedidosCliente(false);
  }

  function handleLimparClienteSelecionado() {
    setClienteSelecionado(null);
    setPedidosClienteSelecionado([]);
    setCustomerName("");
    setCustomerPhone("");
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!customerName.trim() || !subject.trim() || !description.trim()) return;
    setSaving(true);

    await supabase.from("support_tickets").insert({
      customer_name: customerName.trim(),
      customer_phone: customerPhone.trim() || null,
      subject: subject.trim(),
      description: description.trim(),
      priority,
    });

    setCustomerName(""); setCustomerPhone(""); setSubject(""); setDescription(""); setPriority("media");
    handleLimparClienteSelecionado();
    setShowForm(false);
    setSaving(false);
    loadTickets();
  }

  async function handleStatusChange(id, newStatus) {
    const payload = { status: newStatus, updated_at: new Date().toISOString() };
    if (newStatus === "resolvido" || newStatus === "fechado") payload.resolved_at = new Date().toISOString();
    await supabase.from("support_tickets").update(payload).eq("id", id);
    loadTickets();
  }

  async function handleResponseChange(id, value) {
    setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, response: value } : t)));
  }

  async function handleResponseSave(id, value) {
    await supabase.from("support_tickets").update({ response: value, updated_at: new Date().toISOString() }).eq("id", id);
  }

  const counts = STATUSES.reduce((acc, s) => {
    acc[s.id] = tickets.filter((t) => t.status === s.id).length;
    return acc;
  }, {});

  const filtered = tickets.filter((t) => statusFilter === "todos" || t.status === statusFilter);

  return (
    <div>
      <Sidebar />
      <div style={styles.content}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>SAC</h1>
            <p style={styles.subtitle}>Chamados de atendimento ao cliente</p>
          </div>
          <button onClick={() => setShowForm((v) => !v)} style={styles.newButton}>
            <Plus size={16} /> Novo chamado
          </button>
        </div>

        <div style={styles.statsRow}>
          {[{ id: "todos", label: "Todos" }, ...STATUSES].map((s) => (
            <button
              key={s.id}
              onClick={() => setStatusFilter(s.id)}
              style={{ ...styles.statChip, ...(statusFilter === s.id ? styles.statChipActive : {}) }}
            >
              {s.label} {s.id !== "todos" ? `(${counts[s.id] || 0})` : `(${tickets.length})`}
            </button>
          ))}
        </div>

        {showForm && (
          <form onSubmit={handleCreate} style={styles.form}>
            <label style={styles.label}>Buscar cliente já cadastrado</label>
            <div style={{ position: "relative" }}>
              <input
                value={buscaCliente}
                onChange={(e) => setBuscaCliente(e.target.value)}
                style={styles.input}
                placeholder="Digite o nome do cliente…"
              />
              {(resultadosBusca.length > 0 || buscandoCliente) && (
                <div style={styles.buscaDropdown}>
                  {buscandoCliente ? (
                    <div style={styles.buscaItem}>Buscando…</div>
                  ) : (
                    resultadosBusca.map((c) => (
                      <button key={c.id} type="button" onClick={() => handleSelecionarCliente(c)} style={styles.buscaItemButton}>
                        <span style={{ fontWeight: 600 }}>{c.name}</span>
                        <span style={{ fontSize: 11, color: "#a3a3a3" }}>{c.phone}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {clienteSelecionado && (
              <div style={styles.clienteSelecionadoBox}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 700, fontSize: 12.5 }}>✓ {clienteSelecionado.name}</span>
                  <button type="button" onClick={handleLimparClienteSelecionado} style={styles.limparButton}>Trocar</button>
                </div>
                <div style={{ marginTop: 8 }}>
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: "#525252", textTransform: "uppercase" }}>Histórico de pedidos</span>
                  {carregandoPedidosCliente ? (
                    <p style={{ fontSize: 11.5, color: "#a3a3a3", marginTop: 4 }}>Carregando…</p>
                  ) : pedidosClienteSelecionado.length === 0 ? (
                    <p style={{ fontSize: 11.5, color: "#a3a3a3", marginTop: 4 }}>Nenhum pedido ainda.</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
                      {pedidosClienteSelecionado.map((p) => (
                        <div key={p.order_number} style={styles.pedidoPreviewRow}>
                          <span>#{p.order_number} · {new Date(p.created_at).toLocaleDateString("pt-BR")} · {(p.order_items || []).length} item(ns)</span>
                          <span style={{ fontWeight: 700 }}>{fmtMoney(p.total)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div style={styles.row}>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>Nome do cliente *</label>
                <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} style={styles.input} required />
              </div>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>Telefone</label>
                <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} style={styles.input} />
              </div>
            </div>
            <label style={styles.label}>Assunto *</label>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} style={styles.input} required />
            <label style={styles.label}>Descrição *</label>
            <textarea
              value={description} onChange={(e) => setDescription(e.target.value)}
              style={{ ...styles.input, minHeight: 70 }} required
            />
            <label style={styles.label}>Prioridade</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value)} style={styles.input}>
              <option value="baixa">Baixa</option>
              <option value="media">Média</option>
              <option value="alta">Alta</option>
            </select>
            <button type="submit" style={styles.saveButton} disabled={saving}>
              {saving ? "Salvando…" : "Abrir chamado"}
            </button>
          </form>
        )}

        {loading ? (
          <p style={styles.empty}>Carregando…</p>
        ) : filtered.length === 0 ? (
          <p style={styles.empty}>Nenhum chamado nesse filtro.</p>
        ) : (
          <div style={styles.list}>
            {filtered.map((t) => {
              const p = PRIORITIES[t.priority] || PRIORITIES.media;
              const reclamacao = reclamacoesMap[t.id];
              const perfil = customerProfiles[normalizarTelefone(t.customer_phone)];

              return (
                <div key={t.id} style={styles.card}>
                  <div style={styles.cardHeader}>
                    <div style={{ flex: 1 }}>
                      <div style={styles.subjectRow}>
                        <span style={styles.subject}>{t.subject}</span>
                        <span style={{ ...styles.priorityBadge, color: p.color, background: p.bg }}>{p.label}</span>
                        {reclamacao && (
                          <span style={styles.legalBadge} title={`Reclamação formal via ${reclamacao.canal}`}>
                            <Scale size={11} /> Virou reclamação formal ({reclamacao.canal})
                          </span>
                        )}
                      </div>
                      <div style={styles.metaRow}>
                        <span>{t.customer_name}</span>
                        {t.customer_phone && <span style={styles.metaItem}><Phone size={11} /> {t.customer_phone}</span>}
                        {t.orders?.order_number && <span style={styles.metaItem}><ShoppingBag size={11} /> Pedido #{t.orders.order_number}</span>}
                        <span style={styles.metaDate}>{new Date(t.created_at).toLocaleDateString("pt-BR")}</span>
                      </div>
                    </div>
                    <select
                      value={t.status}
                      onChange={(e) => handleStatusChange(t.id, e.target.value)}
                      style={styles.statusSelect}
                    >
                      {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                  </div>

                  {perfil && (
                    <div style={styles.profileBox}>
                      <div style={styles.profileHeader}>
                        <User size={12} /> Cliente já conhecido
                        {perfil.perfil?.icon && (
                          <span style={{ ...styles.perfilBadge, color: perfil.perfil.color, background: perfil.perfil.bg }}>
                            <perfil.perfil.icon size={10} /> {perfil.perfil.label}
                          </span>
                        )}
                      </div>
                      <div style={styles.profileStatsRow}>
                        <span><strong>{perfil.total_pedidos || 0}</strong> pedido(s)</span>
                        <span>Total gasto: <strong>{fmtMoney(perfil.total_gasto)}</strong></span>
                        <span>Ticket médio: <strong>{fmtMoney(perfil.ticket_medio)}</strong></span>
                        {perfil.periodicidade && <span>Compra a cada <strong>{perfil.periodicidade} dias</strong></span>}
                      </div>
                      {perfil.favorito && (
                        <div style={styles.profileFavorito}>
                          <ShoppingBag size={11} /> Mais compra: <strong>{perfil.favorito.nome}</strong> ({perfil.favorito.quantidade}x)
                        </div>
                      )}
                      {perfil.endereco && (
                        <div style={styles.profileAddress}><MapPin size={11} /> {perfil.endereco}</div>
                      )}
                    </div>
                  )}

                  <p style={styles.description}>{t.description}</p>

                  <label style={styles.responseLabel}>Resposta da equipe</label>
                  <textarea
                    value={t.response || ""}
                    onChange={(e) => handleResponseChange(t.id, e.target.value)}
                    onBlur={(e) => handleResponseSave(t.id, e.target.value)}
                    placeholder="Escreva a resposta ou anotação interna sobre esse chamado…"
                    style={styles.responseInput}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SacPage() {
  return (
    <AuthGate>
      <SacContent />
    </AuthGate>
  );
}

const styles = {
  content: { padding: "24px 20px", maxWidth: 1000, margin: "0 auto" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 16 },
  title: { fontSize: 22, fontWeight: 700 },
  subtitle: { fontSize: 13, color: "#737373" },
  newButton: {
    display: "flex", alignItems: "center", gap: 6,
    background: "#171717", color: "#fff", padding: "10px 16px",
    borderRadius: 10, fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer",
  },
  statsRow: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 },
  statChip: {
    border: "1px solid #e5e5e5", background: "#fff", borderRadius: 999,
    padding: "7px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", color: "#737373",
  },
  statChipActive: { background: "#171717", color: "#fff", borderColor: "#171717" },
  form: {
    background: "#fff", border: "1px solid #e5e5e5", borderRadius: 14, padding: 16, marginBottom: 16,
    display: "flex", flexDirection: "column", maxWidth: 520,
  },
  row: { display: "flex", gap: 12 },
  label: { fontSize: 12, fontWeight: 600, color: "#525252", marginBottom: 4, marginTop: 12, display: "block" },
  input: { border: "1px solid #e5e5e5", borderRadius: 10, padding: "9px 12px", outline: "none", width: "100%" },
  saveButton: {
    border: "none", background: "#171717", color: "#fff", borderRadius: 10,
    padding: "11px 18px", fontWeight: 600, fontSize: 13, cursor: "pointer", marginTop: 16,
  },
  empty: { color: "#a3a3a3", fontSize: 13, padding: 24, textAlign: "center" },
  list: { display: "flex", flexDirection: "column", gap: 10 },
  card: { background: "#fff", border: "1px solid #e5e5e5", borderRadius: 14, padding: 16 },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 8 },
  subjectRow: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  subject: { fontSize: 14, fontWeight: 700, color: "#171717" },
  priorityBadge: { fontSize: 10, fontWeight: 700, borderRadius: 999, padding: "2px 8px" },
  legalBadge: {
    display: "flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700,
    borderRadius: 999, padding: "2px 8px", background: "#fee2e2", color: "#dc2626",
  },
  metaRow: { display: "flex", gap: 12, flexWrap: "wrap", fontSize: 11, color: "#a3a3a3", marginTop: 4 },
  metaItem: { display: "flex", alignItems: "center", gap: 4 },
  metaDate: { marginLeft: "auto" },
  statusSelect: { border: "1px solid #e5e5e5", borderRadius: 8, padding: "6px 10px", fontSize: 12, fontWeight: 600 },
  profileBox: { background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: "8px 12px", marginBottom: 10 },
  profileHeader: { display: "flex", alignItems: "center", gap: 5, fontSize: 10.5, fontWeight: 700, color: "#1d4ed8", textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 4, flexWrap: "wrap" },
  perfilBadge: { display: "flex", alignItems: "center", gap: 3, fontSize: 9.5, fontWeight: 700, padding: "2px 7px", borderRadius: 999, textTransform: "none", letterSpacing: 0 },
  profileStatsRow: { display: "flex", gap: 14, flexWrap: "wrap", fontSize: 11.5, color: "#1e3a8a" },
  profileFavorito: { display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#1e3a8a", marginTop: 4 },
  profileAddress: { display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#3b5998", marginTop: 4 },
  description: { fontSize: 13, color: "#525252", marginBottom: 12, lineHeight: 1.5 },
  responseLabel: { fontSize: 11, fontWeight: 600, color: "#525252", display: "block", marginBottom: 4 },
  buscaDropdown: {
    position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 20,
    background: "#fff", border: "1px solid #e5e5e5", borderRadius: 10,
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)", overflow: "hidden", maxHeight: 220, overflowY: "auto",
  },
  buscaItem: { padding: "10px 12px", fontSize: 12, color: "#a3a3a3" },
  buscaItemButton: {
    display: "flex", flexDirection: "column", gap: 1, width: "100%", textAlign: "left",
    padding: "9px 12px", background: "none", border: "none", borderBottom: "1px solid #f5f5f5", cursor: "pointer",
  },
  clienteSelecionadoBox: {
    background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: "10px 12px", marginTop: 10,
  },
  limparButton: {
    border: "1px solid #bfdbfe", background: "#fff", borderRadius: 8, padding: "4px 10px",
    fontSize: 11, fontWeight: 600, cursor: "pointer", color: "#2563eb",
  },
  pedidoPreviewRow: { display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "#1e3a8a" },
  responseInput: {
    border: "1px solid #e5e5e5", borderRadius: 10, padding: "9px 12px", fontSize: 12,
    width: "100%", minHeight: 60, resize: "vertical", outline: "none",
  },
};

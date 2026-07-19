"use client";

import { useEffect, useState } from "react";
import AuthGate from "../../components/AuthGate";
import Sidebar from "../../components/Sidebar";
import { supabase } from "../../lib/supabaseClient";
import { Plus, Phone, ShoppingBag } from "lucide-react";

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

function SacContent() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("aberto");
  const [showForm, setShowForm] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("media");
  const [saving, setSaving] = useState(false);

  async function loadTickets() {
    setLoading(true);
    const { data } = await supabase
      .from("support_tickets")
      .select("*, orders(order_number)")
      .order("created_at", { ascending: false });
    setTickets(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadTickets();
  }, []);

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
              return (
                <div key={t.id} style={styles.card}>
                  <div style={styles.cardHeader}>
                    <div style={{ flex: 1 }}>
                      <div style={styles.subjectRow}>
                        <span style={styles.subject}>{t.subject}</span>
                        <span style={{ ...styles.priorityBadge, color: p.color, background: p.bg }}>{p.label}</span>
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
  metaRow: { display: "flex", gap: 12, flexWrap: "wrap", fontSize: 11, color: "#a3a3a3", marginTop: 4 },
  metaItem: { display: "flex", alignItems: "center", gap: 4 },
  metaDate: { marginLeft: "auto" },
  statusSelect: { border: "1px solid #e5e5e5", borderRadius: 8, padding: "6px 10px", fontSize: 12, fontWeight: 600 },
  description: { fontSize: 13, color: "#525252", marginBottom: 12, lineHeight: 1.5 },
  responseLabel: { fontSize: 11, fontWeight: 600, color: "#525252", display: "block", marginBottom: 4 },
  responseInput: {
    border: "1px solid #e5e5e5", borderRadius: 10, padding: "9px 12px", fontSize: 12,
    width: "100%", minHeight: 60, resize: "vertical", outline: "none",
  },
};

"use client";

import { useEffect, useState } from "react";
import AuthGate from "../../components/AuthGate";
import Sidebar from "../../components/Sidebar";
import { supabase } from "../../lib/supabaseClient";
import { Plus, TrendingUp, TrendingDown, Wallet, AlertTriangle, Check, Trash2 } from "lucide-react";

function todayDateInput() {
  return new Date().toISOString().slice(0, 10);
}

function FinanceiroContent() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("todos");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [showForm, setShowForm] = useState(false);

  const [type, setType] = useState("entrada");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState(todayDateInput());
  const [saving, setSaving] = useState(false);

  async function loadTransactions() {
    setLoading(true);
    const { data } = await supabase
      .from("financial_transactions")
      .select("*")
      .order("due_date", { ascending: true });
    setTransactions(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadTransactions();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    if (!description.trim() || !amount) return;
    setSaving(true);

    await supabase.from("financial_transactions").insert({
      type,
      description: description.trim(),
      category: category.trim() || null,
      amount: parseFloat(amount),
      due_date: dueDate,
      status: "pendente",
    });

    setDescription(""); setCategory(""); setAmount(""); setDueDate(todayDateInput());
    setShowForm(false);
    setSaving(false);
    loadTransactions();
  }

  async function handleMarkDone(id) {
    await supabase
      .from("financial_transactions")
      .update({ status: "concluido", payment_date: todayDateInput() })
      .eq("id", id);
    loadTransactions();
  }

  async function handleDelete(id) {
    if (!confirm("Excluir este lançamento?")) return;
    await supabase.from("financial_transactions").delete().eq("id", id);
    loadTransactions();
  }

  const today = todayDateInput();
  const isOverdue = (t) => t.status === "pendente" && t.due_date < today;

  const saldo = transactions
    .filter((t) => t.status === "concluido")
    .reduce((sum, t) => sum + (t.type === "entrada" ? Number(t.amount) : -Number(t.amount)), 0);

  const aReceber = transactions
    .filter((t) => t.type === "entrada" && t.status === "pendente")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const aPagar = transactions
    .filter((t) => t.type === "saida" && t.status === "pendente")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const overdueCount = transactions.filter(isOverdue).length;

  const filtered = transactions
    .filter((t) => typeFilter === "todos" || t.type === typeFilter)
    .filter((t) => statusFilter === "todos" || t.status === statusFilter);

  return (
    <div>
      <Sidebar />
      <div style={styles.content}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Financeiro</h1>
            <p style={styles.subtitle}>Entradas, saídas e contas a pagar/receber</p>
          </div>
          <button onClick={() => setShowForm((v) => !v)} style={styles.newButton}>
            <Plus size={16} /> Novo lançamento
          </button>
        </div>

        <div style={styles.statsRow}>
          <div style={styles.statCard}>
            <div style={styles.statIcon}><Wallet size={16} color="#171717" /></div>
            <div>
              <div style={styles.statValue}>R$ {saldo.toFixed(2).replace(".", ",")}</div>
              <div style={styles.statLabel}>Saldo (já concluído)</div>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statIcon, background: "#f0fdf4" }}><TrendingUp size={16} color="#16a34a" /></div>
            <div>
              <div style={styles.statValue}>R$ {aReceber.toFixed(2).replace(".", ",")}</div>
              <div style={styles.statLabel}>A receber</div>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statIcon, background: "#fef2f2" }}><TrendingDown size={16} color="#dc2626" /></div>
            <div>
              <div style={styles.statValue}>R$ {aPagar.toFixed(2).replace(".", ",")}</div>
              <div style={styles.statLabel}>A pagar</div>
            </div>
          </div>
          {overdueCount > 0 && (
            <div style={{ ...styles.statCard, ...styles.statCardAlert }}>
              <div style={{ ...styles.statIcon, background: "#fee2e2" }}><AlertTriangle size={16} color="#dc2626" /></div>
              <div>
                <div style={styles.statValue}>{overdueCount}</div>
                <div style={styles.statLabel}>Lançamento(s) atrasado(s)</div>
              </div>
            </div>
          )}
        </div>

        {showForm && (
          <form onSubmit={handleCreate} style={styles.form}>
            <div style={styles.row}>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>Tipo</label>
                <select value={type} onChange={(e) => setType(e.target.value)} style={styles.input}>
                  <option value="entrada">Entrada (a receber)</option>
                  <option value="saida">Saída (a pagar)</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>Categoria</label>
                <input
                  value={category} onChange={(e) => setCategory(e.target.value)}
                  style={styles.input} placeholder="Ex: Fornecedor, Salário, Venda"
                />
              </div>
            </div>
            <label style={styles.label}>Descrição *</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} style={styles.input} required />
            <div style={styles.row}>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>Valor (R$) *</label>
                <input
                  type="number" step="0.01" min="0"
                  value={amount} onChange={(e) => setAmount(e.target.value)}
                  style={styles.input} required
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>Vencimento</label>
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={styles.input} />
              </div>
            </div>
            <button type="submit" style={styles.saveButton} disabled={saving}>
              {saving ? "Salvando…" : "Criar lançamento"}
            </button>
          </form>
        )}

        <div style={styles.filters}>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={styles.filterInput}>
            <option value="todos">Todos os tipos</option>
            <option value="entrada">Só entradas</option>
            <option value="saida">Só saídas</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={styles.filterInput}>
            <option value="todos">Todos os status</option>
            <option value="pendente">Pendente</option>
            <option value="concluido">Concluído</option>
          </select>
        </div>

        {loading ? (
          <p style={styles.empty}>Carregando…</p>
        ) : filtered.length === 0 ? (
          <p style={styles.empty}>Nenhum lançamento encontrado.</p>
        ) : (
          <div style={styles.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th style={styles.th}>Tipo</th>
                  <th style={styles.th}>Descrição</th>
                  <th style={styles.th}>Categoria</th>
                  <th style={styles.th}>Valor</th>
                  <th style={styles.th}>Vencimento</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id} style={{ ...styles.tr, ...(isOverdue(t) ? styles.trOverdue : {}) }}>
                    <td style={styles.td}>
                      <span style={{ ...styles.typeBadge, ...(t.type === "entrada" ? styles.typeIn : styles.typeOut) }}>
                        {t.type === "entrada" ? "Entrada" : "Saída"}
                      </span>
                    </td>
                    <td style={styles.td}>{t.description}</td>
                    <td style={styles.td}>{t.category || "—"}</td>
                    <td style={styles.td}>
                      {t.type === "entrada" ? "+" : "-"}R$ {Number(t.amount).toFixed(2).replace(".", ",")}
                    </td>
                    <td style={styles.td}>
                      {new Date(t.due_date + "T00:00:00").toLocaleDateString("pt-BR")}
                      {isOverdue(t) && <span style={styles.overdueTag}> · Atrasado</span>}
                    </td>
                    <td style={styles.td}>
                      <span style={{ ...styles.badge, ...(t.status === "concluido" ? styles.badgeDone : styles.badgePending) }}>
                        {t.status === "concluido" ? (t.type === "entrada" ? "Recebido" : "Pago") : "Pendente"}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <div style={{ display: "flex", gap: 6 }}>
                        {t.status === "pendente" && (
                          <button onClick={() => handleMarkDone(t.id)} style={styles.iconButton} title="Marcar como concluído">
                            <Check size={14} color="#16a34a" />
                          </button>
                        )}
                        <button onClick={() => handleDelete(t.id)} style={styles.iconButton} title="Excluir">
                          <Trash2 size={14} color="#dc2626" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function FinanceiroPage() {
  return (
    <AuthGate>
      <FinanceiroContent />
    </AuthGate>
  );
}

const styles = {
  content: { padding: "24px 20px", maxWidth: 1100, margin: "0 auto" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 16 },
  title: { fontSize: 22, fontWeight: 700 },
  subtitle: { fontSize: 13, color: "#737373" },
  newButton: {
    display: "flex", alignItems: "center", gap: 6,
    background: "#171717", color: "#fff", padding: "10px 16px",
    borderRadius: 10, fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer",
  },
  statsRow: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 },
  statCard: {
    display: "flex", alignItems: "center", gap: 10,
    background: "#fff", border: "1px solid #e5e5e5", borderRadius: 12, padding: 14,
  },
  statCardAlert: { background: "#fef2f2", borderColor: "#fecaca" },
  statIcon: { width: 32, height: 32, borderRadius: 9, background: "#f5f5f5", display: "flex", alignItems: "center", justifyContent: "center" },
  statValue: { fontSize: 16, fontWeight: 700 },
  statLabel: { fontSize: 11, color: "#737373" },
  form: {
    background: "#fff", border: "1px solid #e5e5e5", borderRadius: 14, padding: 16, marginBottom: 16,
    display: "flex", flexDirection: "column", maxWidth: 480,
  },
  row: { display: "flex", gap: 12 },
  label: { fontSize: 12, fontWeight: 600, color: "#525252", marginBottom: 4, marginTop: 12, display: "block" },
  input: { border: "1px solid #e5e5e5", borderRadius: 10, padding: "9px 12px", outline: "none", width: "100%" },
  saveButton: {
    border: "none", background: "#171717", color: "#fff", borderRadius: 10,
    padding: "11px 18px", fontWeight: 600, fontSize: 13, cursor: "pointer", marginTop: 16,
  },
  filters: { display: "flex", gap: 10, marginBottom: 14 },
  filterInput: { border: "1px solid #e5e5e5", borderRadius: 10, padding: "8px 12px" },
  empty: { color: "#a3a3a3", fontSize: 13, padding: 24, textAlign: "center" },
  tableWrap: { background: "#fff", border: "1px solid #e5e5e5", borderRadius: 14, overflow: "auto" },
  th: { textAlign: "left", fontSize: 11, color: "#a3a3a3", textTransform: "uppercase", padding: "12px 14px", borderBottom: "1px solid #f0f0f0" },
  tr: { borderBottom: "1px solid #f5f5f5" },
  trOverdue: { background: "#fef2f2" },
  td: { padding: "10px 14px", fontSize: 13, verticalAlign: "middle" },
  typeBadge: { fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 999 },
  typeIn: { background: "#dcfce7", color: "#16a34a" },
  typeOut: { background: "#fee2e2", color: "#dc2626" },
  overdueTag: { color: "#dc2626", fontWeight: 700, fontSize: 11 },
  badge: { fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 999 },
  badgeDone: { background: "#dcfce7", color: "#16a34a" },
  badgePending: { background: "#f0f0f0", color: "#737373" },
  iconButton: {
    width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
    borderRadius: 8, border: "1px solid #e5e5e5", background: "#fff", cursor: "pointer",
  },
};

"use client";

import { useEffect, useMemo, useState } from "react";
import AuthGate from "../../components/AuthGate";
import Sidebar from "../../components/Sidebar";
import TransactionDetailModal from "../../components/TransactionDetailModal";
import { supabase } from "../../lib/supabaseClient";
import { Plus, TrendingUp, TrendingDown, Wallet, AlertTriangle, CheckSquare, Square, Layers } from "lucide-react";

function todayDateInput() {
  return new Date().toISOString().slice(0, 10);
}
function currentMonthInput() {
  return new Date().toISOString().slice(0, 7);
}

function FinanceiroContent() {
  const [tab, setTab] = useState("contas"); // contas | caixa
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailTransaction, setDetailTransaction] = useState(null);

  // Filtros — Contas
  const [typeFilter, setTypeFilter] = useState("todos");
  const [statusFilter, setStatusFilter] = useState("pendente");
  const [categoryFilter, setCategoryFilter] = useState("todos");
  const [originFilter, setOriginFilter] = useState("todos");
  const [selectedIds, setSelectedIds] = useState([]);

  // Filtros — Caixa
  const [caixaMonth, setCaixaMonth] = useState(currentMonthInput());
  const [caixaTypeFilter, setCaixaTypeFilter] = useState("todos");
  const [caixaCategoryFilter, setCaixaCategoryFilter] = useState("todos");

  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState("entrada");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState(todayDateInput());
  const [saving, setSaving] = useState(false);

  async function loadTransactions() {
    setLoading(true);
    const { data } = await supabase.from("financial_transactions").select("*").order("due_date", { ascending: true });
    setTransactions(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadTransactions();
  }, []);

  const categories = useMemo(
    () => [...new Set(transactions.map((t) => t.category).filter(Boolean))],
    [transactions]
  );

  async function handleCreate(e) {
    e.preventDefault();
    if (!description.trim() || !amount) return;
    setSaving(true);
    await supabase.from("financial_transactions").insert({
      type, description: description.trim(), category: category.trim() || null,
      amount: parseFloat(amount), due_date: dueDate, status: "pendente", origin: "manual",
    });
    setDescription(""); setCategory(""); setAmount(""); setDueDate(todayDateInput());
    setShowForm(false); setSaving(false);
    loadTransactions();
  }

  async function handleBaixaIndividual(id) {
    await supabase.from("financial_transactions")
      .update({ status: "baixado", payment_date: todayDateInput() })
      .eq("id", id);
    loadTransactions();
  }

  async function handleBaixaEmLote() {
    if (selectedIds.length === 0) return;
    const groupId = crypto.randomUUID();
    await supabase.from("financial_transactions")
      .update({ status: "baixado", payment_date: todayDateInput(), settlement_group_id: groupId })
      .in("id", selectedIds);
    setSelectedIds([]);
    loadTransactions();
  }

  function toggleSelect(id) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const today = todayDateInput();
  const isOverdue = (t) => t.status === "pendente" && t.due_date < today;

  // ── Dados da aba Contas ──
  const contasFiltered = transactions
    .filter((t) => typeFilter === "todos" || t.type === typeFilter)
    .filter((t) => statusFilter === "todos" || t.status === statusFilter)
    .filter((t) => categoryFilter === "todos" || t.category === categoryFilter)
    .filter((t) => originFilter === "todos" || t.origin === originFilter);

  const aReceber = transactions.filter((t) => t.type === "entrada" && t.status === "pendente").reduce((s, t) => s + Number(t.amount), 0);
  const aPagar = transactions.filter((t) => t.type === "saida" && t.status === "pendente").reduce((s, t) => s + Number(t.amount), 0);
  const overdueCount = transactions.filter(isOverdue).length;
  const selectedTotal = transactions.filter((t) => selectedIds.includes(t.id)).reduce((s, t) => s + Number(t.amount), 0);

  // ── Dados da aba Caixa ──
  const caixaFiltered = transactions
    .filter((t) => t.status === "baixado")
    .filter((t) => t.payment_date && t.payment_date.startsWith(caixaMonth))
    .filter((t) => caixaTypeFilter === "todos" || t.type === caixaTypeFilter)
    .filter((t) => caixaCategoryFilter === "todos" || t.category === caixaCategoryFilter);

  const caixaReceitas = caixaFiltered.filter((t) => t.type === "entrada").reduce((s, t) => s + Number(t.amount), 0);
  const caixaDespesas = caixaFiltered.filter((t) => t.type === "saida").reduce((s, t) => s + Number(t.amount), 0);
  const caixaSaldo = caixaReceitas - caixaDespesas;

  return (
    <div>
      <Sidebar />
      <div style={styles.content}>
        <h1 style={styles.title}>Financeiro</h1>
        <p style={styles.subtitle}>Contas a pagar/receber e controle de caixa</p>

        <div style={styles.tabs}>
          <button onClick={() => setTab("contas")} style={{ ...styles.tabButton, ...(tab === "contas" ? styles.tabActive : {}) }}>Contas a Pagar/Receber</button>
          <button onClick={() => setTab("caixa")} style={{ ...styles.tabButton, ...(tab === "caixa" ? styles.tabActive : {}) }}>Caixa</button>
        </div>

        {tab === "contas" ? (
          <>
            <div style={styles.statsRow}>
              <div style={styles.statCard}>
                <div style={{ ...styles.statIcon, background: "#f0fdf4" }}><TrendingUp size={16} color="#16a34a" /></div>
                <div><div style={styles.statValue}>R$ {aReceber.toFixed(2).replace(".", ",")}</div><div style={styles.statLabel}>A receber</div></div>
              </div>
              <div style={styles.statCard}>
                <div style={{ ...styles.statIcon, background: "#fef2f2" }}><TrendingDown size={16} color="#dc2626" /></div>
                <div><div style={styles.statValue}>R$ {aPagar.toFixed(2).replace(".", ",")}</div><div style={styles.statLabel}>A pagar</div></div>
              </div>
              {overdueCount > 0 && (
                <div style={{ ...styles.statCard, ...styles.statCardAlert }}>
                  <div style={{ ...styles.statIcon, background: "#fee2e2" }}><AlertTriangle size={16} color="#dc2626" /></div>
                  <div><div style={styles.statValue}>{overdueCount}</div><div style={styles.statLabel}>Atrasado(s)</div></div>
                </div>
              )}
            </div>

            <div style={styles.headerRow}>
              <button onClick={() => setShowForm((v) => !v)} style={styles.newButton}><Plus size={16} /> Novo lançamento</button>
              {selectedIds.length > 0 && (
                <button onClick={handleBaixaEmLote} style={styles.batchButton}>
                  <Layers size={14} /> Dar baixa em {selectedIds.length} conta(s) — R$ {selectedTotal.toFixed(2).replace(".", ",")}
                </button>
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
                    <input list="fin-categories" value={category} onChange={(e) => setCategory(e.target.value)} style={styles.input} placeholder="Ex: Fornecedor, Salário" />
                    <datalist id="fin-categories">{categories.map((c) => <option key={c} value={c} />)}</datalist>
                  </div>
                </div>
                <label style={styles.label}>Descrição *</label>
                <input value={description} onChange={(e) => setDescription(e.target.value)} style={styles.input} required />
                <div style={styles.row}>
                  <div style={{ flex: 1 }}>
                    <label style={styles.label}>Valor (R$) *</label>
                    <input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} style={styles.input} required />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={styles.label}>Vencimento</label>
                    <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={styles.input} />
                  </div>
                </div>
                <button type="submit" style={styles.saveButton} disabled={saving}>{saving ? "Salvando…" : "Criar lançamento"}</button>
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
                <option value="baixado">Baixado</option>
              </select>
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={styles.filterInput}>
                <option value="todos">Todas as categorias</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={originFilter} onChange={(e) => setOriginFilter(e.target.value)} style={styles.filterInput}>
                <option value="todos">Toda origem</option>
                <option value="manual">Lançado manualmente</option>
                <option value="pedido_entregue">Gerado por pedido entregue</option>
              </select>
            </div>

            {loading ? (
              <p style={styles.empty}>Carregando…</p>
            ) : contasFiltered.length === 0 ? (
              <p style={styles.empty}>Nenhum lançamento encontrado.</p>
            ) : (
              <div style={styles.tableWrap}>
                <table>
                  <thead>
                    <tr>
                      <th style={styles.th}></th>
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
                    {contasFiltered.map((t) => (
                      <tr key={t.id} style={{ ...styles.tr, ...(isOverdue(t) ? styles.trOverdue : {}) }}>
                        <td style={styles.td} onClick={(e) => e.stopPropagation()}>
                          {t.status === "pendente" && (
                            <button onClick={() => toggleSelect(t.id)} style={styles.checkboxButton}>
                              {selectedIds.includes(t.id) ? <CheckSquare size={16} color="#171717" /> : <Square size={16} color="#d4d4d4" />}
                            </button>
                          )}
                        </td>
                        <td style={styles.td} onClick={() => setDetailTransaction(t)}>
                          <span style={{ ...styles.typeBadge, ...(t.type === "entrada" ? styles.typeIn : styles.typeOut) }}>{t.type === "entrada" ? "Entrada" : "Saída"}</span>
                        </td>
                        <td style={{ ...styles.td, cursor: "pointer" }} onClick={() => setDetailTransaction(t)}>{t.description}</td>
                        <td style={{ ...styles.td, cursor: "pointer" }} onClick={() => setDetailTransaction(t)}>{t.category || "—"}</td>
                        <td style={{ ...styles.td, cursor: "pointer" }} onClick={() => setDetailTransaction(t)}>{t.type === "entrada" ? "+" : "-"}R$ {Number(t.amount).toFixed(2).replace(".", ",")}</td>
                        <td style={{ ...styles.td, cursor: "pointer" }} onClick={() => setDetailTransaction(t)}>
                          {new Date(t.due_date + "T00:00:00").toLocaleDateString("pt-BR")}
                          {isOverdue(t) && <span style={styles.overdueTag}> · Atrasado</span>}
                        </td>
                        <td style={{ ...styles.td, cursor: "pointer" }} onClick={() => setDetailTransaction(t)}>
                          <span style={{ ...styles.badge, ...(t.status === "baixado" ? styles.badgeDone : styles.badgePending) }}>
                            {t.status === "baixado" ? "Baixado" : "Pendente"}
                          </span>
                        </td>
                        <td style={styles.td} onClick={(e) => e.stopPropagation()}>
                          {t.status === "pendente" && (
                            <button onClick={() => handleBaixaIndividual(t.id)} style={styles.baixaButton}>Dar baixa</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          <>
            <div style={styles.filters}>
              <input type="month" value={caixaMonth} onChange={(e) => setCaixaMonth(e.target.value)} style={styles.filterInput} />
              <select value={caixaTypeFilter} onChange={(e) => setCaixaTypeFilter(e.target.value)} style={styles.filterInput}>
                <option value="todos">Todos os tipos</option>
                <option value="entrada">Só entradas</option>
                <option value="saida">Só saídas</option>
              </select>
              <select value={caixaCategoryFilter} onChange={(e) => setCaixaCategoryFilter(e.target.value)} style={styles.filterInput}>
                <option value="todos">Todas as categorias</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div style={styles.statsRow}>
              <div style={styles.statCard}>
                <div style={{ ...styles.statIcon, background: "#f0fdf4" }}><TrendingUp size={16} color="#16a34a" /></div>
                <div><div style={styles.statValue}>R$ {caixaReceitas.toFixed(2).replace(".", ",")}</div><div style={styles.statLabel}>Receitas do mês</div></div>
              </div>
              <div style={styles.statCard}>
                <div style={{ ...styles.statIcon, background: "#fef2f2" }}><TrendingDown size={16} color="#dc2626" /></div>
                <div><div style={styles.statValue}>R$ {caixaDespesas.toFixed(2).replace(".", ",")}</div><div style={styles.statLabel}>Despesas do mês</div></div>
              </div>
              <div style={styles.statCard}>
                <div style={{ ...styles.statIcon, background: caixaSaldo >= 0 ? "#f0fdf4" : "#fef2f2" }}><Wallet size={16} color={caixaSaldo >= 0 ? "#16a34a" : "#dc2626"} /></div>
                <div><div style={{ ...styles.statValue, color: caixaSaldo >= 0 ? "#16a34a" : "#dc2626" }}>R$ {caixaSaldo.toFixed(2).replace(".", ",")}</div><div style={styles.statLabel}>Saldo do mês</div></div>
              </div>
            </div>

            {loading ? (
              <p style={styles.empty}>Carregando…</p>
            ) : caixaFiltered.length === 0 ? (
              <p style={styles.empty}>Nenhum lançamento baixado nesse período.</p>
            ) : (
              <div style={styles.tableWrap}>
                <table>
                  <thead>
                    <tr>
                      <th style={styles.th}>Data da baixa</th>
                      <th style={styles.th}>Tipo</th>
                      <th style={styles.th}>Descrição</th>
                      <th style={styles.th}>Categoria</th>
                      <th style={styles.th}>Valor</th>
                      <th style={styles.th}>Lote</th>
                    </tr>
                  </thead>
                  <tbody>
                    {caixaFiltered.map((t) => (
                      <tr key={t.id} style={{ ...styles.tr, cursor: "pointer" }} onClick={() => setDetailTransaction(t)}>
                        <td style={styles.td}>{new Date(t.payment_date + "T00:00:00").toLocaleDateString("pt-BR")}</td>
                        <td style={styles.td}><span style={{ ...styles.typeBadge, ...(t.type === "entrada" ? styles.typeIn : styles.typeOut) }}>{t.type === "entrada" ? "Entrada" : "Saída"}</span></td>
                        <td style={styles.td}>{t.description}</td>
                        <td style={styles.td}>{t.category || "—"}</td>
                        <td style={styles.td}>{t.type === "entrada" ? "+" : "-"}R$ {Number(t.amount).toFixed(2).replace(".", ",")}</td>
                        <td style={styles.td}>{t.settlement_group_id ? <span style={styles.groupTag}>Em lote</span> : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {detailTransaction && (
        <TransactionDetailModal transaction={detailTransaction} onClose={() => setDetailTransaction(null)} />
      )}
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
  title: { fontSize: 22, fontWeight: 700 },
  subtitle: { fontSize: 13, color: "#737373", marginBottom: 16 },
  tabs: { display: "flex", gap: 4, marginBottom: 18, borderBottom: "1px solid #e5e5e5" },
  tabButton: { border: "none", background: "none", padding: "10px 4px", marginRight: 20, fontSize: 13.5, fontWeight: 600, color: "#a3a3a3", cursor: "pointer", borderBottom: "2px solid transparent" },
  tabActive: { color: "#171717", borderBottomColor: "#171717" },
  statsRow: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 },
  statCard: { display: "flex", alignItems: "center", gap: 10, background: "#fff", border: "1px solid #e5e5e5", borderRadius: 12, padding: 14 },
  statCardAlert: { background: "#fef2f2", borderColor: "#fecaca" },
  statIcon: { width: 32, height: 32, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center" },
  statValue: { fontSize: 16, fontWeight: 700 },
  statLabel: { fontSize: 11, color: "#737373" },
  headerRow: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 14 },
  newButton: { display: "flex", alignItems: "center", gap: 6, background: "#171717", color: "#fff", padding: "10px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer" },
  batchButton: { display: "flex", alignItems: "center", gap: 6, background: "#2563eb", color: "#fff", padding: "10px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer" },
  form: { background: "#fff", border: "1px solid #e5e5e5", borderRadius: 14, padding: 16, marginBottom: 16, display: "flex", flexDirection: "column", maxWidth: 480 },
  row: { display: "flex", gap: 12 },
  label: { fontSize: 12, fontWeight: 600, color: "#525252", marginBottom: 4, marginTop: 12, display: "block" },
  input: { border: "1px solid #e5e5e5", borderRadius: 10, padding: "9px 12px", outline: "none", width: "100%" },
  saveButton: { border: "none", background: "#171717", color: "#fff", borderRadius: 10, padding: "11px 18px", fontWeight: 600, fontSize: 13, cursor: "pointer", marginTop: 16 },
  filters: { display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" },
  filterInput: { border: "1px solid #e5e5e5", borderRadius: 10, padding: "8px 12px" },
  empty: { color: "#a3a3a3", fontSize: 13, padding: 24, textAlign: "center" },
  tableWrap: { background: "#fff", border: "1px solid #e5e5e5", borderRadius: 14, overflow: "auto" },
  th: { textAlign: "left", fontSize: 11, color: "#a3a3a3", textTransform: "uppercase", padding: "12px 14px", borderBottom: "1px solid #f0f0f0" },
  tr: { borderBottom: "1px solid #f5f5f5" },
  trOverdue: { background: "#fef2f2" },
  td: { padding: "10px 14px", fontSize: 13, verticalAlign: "middle" },
  checkboxButton: { background: "none", border: "none", cursor: "pointer", display: "flex" },
  typeBadge: { fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 999 },
  typeIn: { background: "#dcfce7", color: "#16a34a" },
  typeOut: { background: "#fee2e2", color: "#dc2626" },
  overdueTag: { color: "#dc2626", fontWeight: 700, fontSize: 11 },
  badge: { fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 999 },
  badgeDone: { background: "#dbeafe", color: "#2563eb" },
  badgePending: { background: "#f0f0f0", color: "#737373" },
  baixaButton: { border: "1px solid #e5e5e5", background: "#fff", borderRadius: 8, padding: "6px 10px", fontSize: 11.5, fontWeight: 600, cursor: "pointer" },
  groupTag: { fontSize: 10.5, fontWeight: 700, background: "#dbeafe", color: "#2563eb", borderRadius: 999, padding: "2px 8px" },
};

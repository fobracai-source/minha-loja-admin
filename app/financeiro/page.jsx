"use client";

import { useEffect, useMemo, useState } from "react";
import AuthGate from "../../components/AuthGate";
import Sidebar from "../../components/Sidebar";
import TransactionDetailModal from "../../components/TransactionDetailModal";
import BreakEvenChart from "../../components/BreakEvenChart";
import { supabase } from "../../lib/supabaseClient";
import { Plus, TrendingUp, TrendingDown, Wallet, AlertTriangle, CheckSquare, Square, Layers, Info, Scale } from "lucide-react";

function todayDateInput() {
  return new Date().toISOString().slice(0, 10);
}
function currentMonthInput() {
  return new Date().toISOString().slice(0, 7);
}
function currentYear() {
  return new Date().getFullYear();
}
function lastDayOfMonth(yyyyMM) {
  const [y, m] = yyyyMM.split("-").map(Number);
  return new Date(y, m, 0).toISOString().slice(0, 10);
}

function FinanceiroContent() {
  const [tab, setTab] = useState("contas"); // contas | caixa | dre
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

  // Filtros — DRE
  const [drePeriodType, setDrePeriodType] = useState("mensal"); // mensal | anual | personalizado
  const [dreMonth, setDreMonth] = useState(currentMonthInput());
  const [dreYear, setDreYear] = useState(String(currentYear()));
  const [dreStart, setDreStart] = useState(todayDateInput());
  const [dreEnd, setDreEnd] = useState(todayDateInput());
  const [dreRegime, setDreRegime] = useState("competencia"); // caixa | competencia
  const [dreLoading, setDreLoading] = useState(false);
  const [dreData, setDreData] = useState(null);

  // Filtros e dados — Ponto de Equilíbrio
  const [pePeriodType, setPePeriodType] = useState("mensal");
  const [peMonth, setPeMonth] = useState(currentMonthInput());
  const [peYear, setPeYear] = useState(String(currentYear()));
  const [peStart, setPeStart] = useState(todayDateInput());
  const [peEnd, setPeEnd] = useState(todayDateInput());
  const [desiredProfit, setDesiredProfit] = useState("");
  const [peLoading, setPeLoading] = useState(false);
  const [peData, setPeData] = useState(null);

  // Plano de Contas
  const [chartOfAccounts, setChartOfAccounts] = useState([]);
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [accountName, setAccountName] = useState("");
  const [accountType, setAccountType] = useState("despesa");
  const [accountClassification, setAccountClassification] = useState("variavel");
  const [savingAccount, setSavingAccount] = useState(false);

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

  async function loadChartOfAccounts() {
    const { data } = await supabase.from("chart_of_accounts").select("*").order("name");
    setChartOfAccounts(data || []);
  }

  async function handleCreateAccount(e) {
    e.preventDefault();
    if (!accountName.trim()) return;
    setSavingAccount(true);
    await supabase.from("chart_of_accounts").insert({
      name: accountName.trim().toUpperCase(),
      type: accountType,
      classification: accountClassification,
    });
    setAccountName(""); setAccountType("despesa"); setAccountClassification("variavel");
    setShowAccountForm(false);
    setSavingAccount(false);
    loadChartOfAccounts();
  }

  async function handleUpdateAccount(id, field, value) {
    setChartOfAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, [field]: value } : a)));
    await supabase.from("chart_of_accounts").update({ [field]: value }).eq("id", id);
  }

  useEffect(() => {
    loadTransactions();
    loadChartOfAccounts();
  }, []);

  // Mapas rápidos: nome da conta -> tipo / classificação
  const accountTypeMap = useMemo(() => {
    const map = {};
    chartOfAccounts.forEach((a) => { map[a.name] = a.type; });
    return map;
  }, [chartOfAccounts]);

  const accountClassificationMap = useMemo(() => {
    const map = {};
    chartOfAccounts.forEach((a) => { map[a.name] = a.classification; });
    return map;
  }, [chartOfAccounts]);

  const categories = useMemo(
    () => chartOfAccounts.filter((a) => a.active).map((a) => a.name),
    [chartOfAccounts]
  );

  function handleCategorySelect(catName) {
    setCategory(catName);
    const accType = accountTypeMap[catName];
    if (accType === "receita") setType("entrada");
    else if (accType === "despesa") setType("saida");
  }

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
    await supabase.from("financial_transactions").update({ status: "baixado", payment_date: todayDateInput() }).eq("id", id);
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

  const contasFiltered = transactions
    .filter((t) => typeFilter === "todos" || t.type === typeFilter)
    .filter((t) => statusFilter === "todos" || t.status === statusFilter)
    .filter((t) => categoryFilter === "todos" || t.category === categoryFilter)
    .filter((t) => originFilter === "todos" || t.origin === originFilter);

  const aReceber = transactions.filter((t) => t.type === "entrada" && t.status === "pendente").reduce((s, t) => s + Number(t.amount), 0);
  const aPagar = transactions.filter((t) => t.type === "saida" && t.status === "pendente").reduce((s, t) => s + Number(t.amount), 0);
  const overdueCount = transactions.filter(isOverdue).length;
  const selectedTotal = transactions.filter((t) => selectedIds.includes(t.id)).reduce((s, t) => s + Number(t.amount), 0);

  const caixaFiltered = transactions
    .filter((t) => t.status === "baixado")
    .filter((t) => t.payment_date && t.payment_date.startsWith(caixaMonth))
    .filter((t) => caixaTypeFilter === "todos" || t.type === caixaTypeFilter)
    .filter((t) => caixaCategoryFilter === "todos" || t.category === caixaCategoryFilter);

  const caixaReceitas = caixaFiltered.filter((t) => t.type === "entrada").reduce((s, t) => s + Number(t.amount), 0);
  const caixaDespesas = caixaFiltered.filter((t) => t.type === "saida").reduce((s, t) => s + Number(t.amount), 0);
  const caixaSaldo = caixaReceitas - caixaDespesas;

  // ── Cálculo da DRE ──
  function getDrePeriodRange() {
    if (drePeriodType === "mensal") return { start: `${dreMonth}-01`, end: lastDayOfMonth(dreMonth) };
    if (drePeriodType === "anual") return { start: `${dreYear}-01-01`, end: `${dreYear}-12-31` };
    return { start: dreStart, end: dreEnd };
  }

  async function calculateDRE() {
    setDreLoading(true);
    const { start, end } = getDrePeriodRange();

    let query = supabase.from("financial_transactions").select("*");
    if (dreRegime === "caixa") {
      query = query.eq("status", "baixado").gte("payment_date", start).lte("payment_date", end);
    } else {
      query = query.gte("due_date", start).lte("due_date", end);
    }
    const { data: periodTransactions } = await query;
    const txs = periodTransactions || [];

    const receitaVendaTxs = txs.filter((t) => t.type === "entrada" && t.category === "RECEITA DE VENDA");
    const outrasReceitasTxs = txs.filter((t) => t.type === "entrada" && t.category !== "RECEITA DE VENDA");
    const despesasTxs = txs.filter((t) => t.type === "saida");

    const receitaVendas = receitaVendaTxs.reduce((s, t) => s + Number(t.amount), 0);
    const outrasReceitas = outrasReceitasTxs.reduce((s, t) => s + Number(t.amount), 0);
    const totalDespesas = despesasTxs.reduce((s, t) => s + Number(t.amount), 0);

    // Agrupa despesas por categoria
    const despesasPorCategoria = {};
    despesasTxs.forEach((t) => {
      const cat = t.category || "Sem categoria";
      despesasPorCategoria[cat] = (despesasPorCategoria[cat] || 0) + Number(t.amount);
    });

    // Calcula o CMV: busca os pedidos ligados às receitas de venda do período,
    // pega os itens vendidos e multiplica pela "Valor de Compra" de cada produto
    let cmv = 0;
    const orderIds = [...new Set(receitaVendaTxs.map((t) => t.order_id).filter(Boolean))];

    if (orderIds.length > 0) {
      const { data: items } = await supabase
        .from("order_items")
        .select("product_id, quantity, order_id")
        .in("order_id", orderIds);

      const productIds = [...new Set((items || []).map((i) => i.product_id).filter(Boolean))];
      const { data: products } = await supabase
        .from("products")
        .select("id, cost_price")
        .in("id", productIds);

      const costMap = {};
      (products || []).forEach((p) => { costMap[p.id] = Number(p.cost_price) || 0; });

      cmv = (items || []).reduce((sum, item) => sum + (costMap[item.product_id] || 0) * item.quantity, 0);
    }

    const lucroBruto = receitaVendas - cmv;
    const resultado = lucroBruto + outrasReceitas - totalDespesas;

    setDreData({
      start, end, receitaVendas, cmv, lucroBruto, outrasReceitas,
      totalDespesas, despesasPorCategoria, resultado,
      margemBruta: receitaVendas > 0 ? (lucroBruto / receitaVendas) * 100 : null,
      margemLiquida: receitaVendas > 0 ? (resultado / receitaVendas) * 100 : null,
      vendasCount: receitaVendaTxs.length,
    });
    setDreLoading(false);
  }

  useEffect(() => {
    if (tab === "dre") calculateDRE();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, drePeriodType, dreMonth, dreYear, dreStart, dreEnd, dreRegime]);

  // ── Cálculo do Ponto de Equilíbrio ──
  function getPePeriodRange() {
    if (pePeriodType === "mensal") return { start: `${peMonth}-01`, end: lastDayOfMonth(peMonth) };
    if (pePeriodType === "anual") return { start: `${peYear}-01-01`, end: `${peYear}-12-31` };
    return { start: peStart, end: peEnd };
  }

  async function calculatePontoEquilibrio() {
    setPeLoading(true);
    const { start, end } = getPePeriodRange();

    const { data: periodTransactions } = await supabase
      .from("financial_transactions")
      .select("*")
      .gte("due_date", start)
      .lte("due_date", end);

    const txs = periodTransactions || [];
    const receitaVendaTxs = txs.filter((t) => t.type === "entrada" && t.category === "RECEITA DE VENDA");
    const despesasTxs = txs.filter((t) => t.type === "saida");

    const receitaTotal = receitaVendaTxs.reduce((s, t) => s + Number(t.amount), 0);

    // CMV (mesmo cálculo da DRE) — é sempre custo variável
    let cmv = 0;
    const orderIds = [...new Set(receitaVendaTxs.map((t) => t.order_id).filter(Boolean))];
    if (orderIds.length > 0) {
      const { data: items } = await supabase.from("order_items").select("product_id, quantity, order_id").in("order_id", orderIds);
      const productIds = [...new Set((items || []).map((i) => i.product_id).filter(Boolean))];
      const { data: products } = await supabase.from("products").select("id, cost_price").in("id", productIds);
      const costMap = {};
      (products || []).forEach((p) => { costMap[p.id] = Number(p.cost_price) || 0; });
      cmv = (items || []).reduce((sum, item) => sum + (costMap[item.product_id] || 0) * item.quantity, 0);
    }

    // Despesas do período separadas por classificação (fixo/variável)
    let despesasFixas = 0;
    let despesasVariaveis = 0;
    despesasTxs.forEach((t) => {
      const cat = t.category || "Sem categoria";
      const costType = accountClassificationMap[cat] || "variavel";
      if (costType === "fixo") despesasFixas += Number(t.amount);
      else despesasVariaveis += Number(t.amount);
    });

    const custosVariaveisTotais = cmv + despesasVariaveis;
    const custosFixosTotais = despesasFixas;

    const margemContribuicao = receitaTotal - custosVariaveisTotais;
    const margemContribuicaoPct = receitaTotal > 0 ? margemContribuicao / receitaTotal : 0;
    const variableCostRate = receitaTotal > 0 ? custosVariaveisTotais / receitaTotal : 0;

    const peContabil = margemContribuicaoPct > 0 ? custosFixosTotais / margemContribuicaoPct : null;
    const lucroDesejadoNum = parseFloat(desiredProfit) || 0;
    const peEconomico = margemContribuicaoPct > 0 ? (custosFixosTotais + lucroDesejadoNum) / margemContribuicaoPct : null;

    const ticketMedio = receitaVendaTxs.length > 0 ? receitaTotal / receitaVendaTxs.length : 0;

    setPeData({
      start, end, receitaTotal, cmv, despesasFixas, despesasVariaveis,
      custosVariaveisTotais, custosFixosTotais, margemContribuicao, margemContribuicaoPct,
      variableCostRate, peContabil, peEconomico, lucroDesejadoNum, ticketMedio,
      vendasCount: receitaVendaTxs.length,
    });
    setPeLoading(false);
  }

  useEffect(() => {
    if (tab === "equilibrio") calculatePontoEquilibrio();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, pePeriodType, peMonth, peYear, peStart, peEnd, desiredProfit, accountClassificationMap]);

  function fmt(v) {
    return `R$ ${Number(v).toFixed(2).replace(".", ",")}`;
  }

  return (
    <div>
      <Sidebar />
      <div style={styles.content}>
        <h1 style={styles.title}>Financeiro</h1>
        <p style={styles.subtitle}>Contas a pagar/receber, caixa e resultado do período</p>

        <div style={styles.tabs}>
          <button onClick={() => setTab("contas")} style={{ ...styles.tabButton, ...(tab === "contas" ? styles.tabActive : {}) }}>Contas a Pagar/Receber</button>
          <button onClick={() => setTab("caixa")} style={{ ...styles.tabButton, ...(tab === "caixa" ? styles.tabActive : {}) }}>Caixa</button>
          <button onClick={() => setTab("plano")} style={{ ...styles.tabButton, ...(tab === "plano" ? styles.tabActive : {}) }}>Plano de Contas</button>
          <button onClick={() => setTab("dre")} style={{ ...styles.tabButton, ...(tab === "dre" ? styles.tabActive : {}) }}>DRE</button>
          <button onClick={() => setTab("equilibrio")} style={{ ...styles.tabButton, ...(tab === "equilibrio" ? styles.tabActive : {}) }}>Ponto de Equilíbrio</button>
        </div>

        {tab === "contas" && (
          <>
            <div style={styles.statsRow}>
              <div style={styles.statCard}>
                <div style={{ ...styles.statIcon, background: "#f0fdf4" }}><TrendingUp size={16} color="#16a34a" /></div>
                <div><div style={styles.statValue}>{fmt(aReceber)}</div><div style={styles.statLabel}>A receber</div></div>
              </div>
              <div style={styles.statCard}>
                <div style={{ ...styles.statIcon, background: "#fef2f2" }}><TrendingDown size={16} color="#dc2626" /></div>
                <div><div style={styles.statValue}>{fmt(aPagar)}</div><div style={styles.statLabel}>A pagar</div></div>
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
                  <Layers size={14} /> Dar baixa em {selectedIds.length} conta(s) — {fmt(selectedTotal)}
                </button>
              )}
            </div>

            {showForm && (
              <form onSubmit={handleCreate} style={styles.form}>
                <div style={styles.row}>
                  <div style={{ flex: 1 }}>
                    <label style={styles.label}>Categoria (Plano de Contas) *</label>
                    <select value={category} onChange={(e) => handleCategorySelect(e.target.value)} style={styles.input} required>
                      <option value="">Selecione…</option>
                      {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={styles.label}>Tipo (automático pela categoria)</label>
                    <div style={styles.autoTypeBox}>
                      <span style={{ ...styles.typeBadge, ...(type === "entrada" ? styles.typeIn : styles.typeOut) }}>
                        {type === "entrada" ? "Entrada (a receber)" : "Saída (a pagar)"}
                      </span>
                    </div>
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
                {categories.length === 0 && (
                  <p style={styles.warnNote}>Nenhuma conta cadastrada ainda — crie uma na aba "Plano de Contas" primeiro.</p>
                )}
                <button type="submit" style={styles.saveButton} disabled={saving || !category}>{saving ? "Salvando…" : "Criar lançamento"}</button>
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
                        <td style={{ ...styles.td, cursor: "pointer" }} onClick={() => setDetailTransaction(t)}>
                          <span style={{ ...styles.typeBadge, ...(t.type === "entrada" ? styles.typeIn : styles.typeOut) }}>{t.type === "entrada" ? "Entrada" : "Saída"}</span>
                        </td>
                        <td style={{ ...styles.td, cursor: "pointer" }} onClick={() => setDetailTransaction(t)}>{t.description}</td>
                        <td style={{ ...styles.td, cursor: "pointer" }} onClick={() => setDetailTransaction(t)}>{t.category || "—"}</td>
                        <td style={{ ...styles.td, cursor: "pointer" }} onClick={() => setDetailTransaction(t)}>{t.type === "entrada" ? "+" : "-"}{fmt(t.amount)}</td>
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
        )}

        {tab === "caixa" && (
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
                <div><div style={styles.statValue}>{fmt(caixaReceitas)}</div><div style={styles.statLabel}>Receitas do mês</div></div>
              </div>
              <div style={styles.statCard}>
                <div style={{ ...styles.statIcon, background: "#fef2f2" }}><TrendingDown size={16} color="#dc2626" /></div>
                <div><div style={styles.statValue}>{fmt(caixaDespesas)}</div><div style={styles.statLabel}>Despesas do mês</div></div>
              </div>
              <div style={styles.statCard}>
                <div style={{ ...styles.statIcon, background: caixaSaldo >= 0 ? "#f0fdf4" : "#fef2f2" }}><Wallet size={16} color={caixaSaldo >= 0 ? "#16a34a" : "#dc2626"} /></div>
                <div><div style={{ ...styles.statValue, color: caixaSaldo >= 0 ? "#16a34a" : "#dc2626" }}>{fmt(caixaSaldo)}</div><div style={styles.statLabel}>Saldo do mês</div></div>
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
                        <td style={styles.td}>{t.type === "entrada" ? "+" : "-"}{fmt(t.amount)}</td>
                        <td style={styles.td}>{t.settlement_group_id ? <span style={styles.groupTag}>Em lote</span> : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {tab === "plano" && (
          <>
            <p style={styles.dreExplainer}>
              <Info size={13} style={{ flexShrink: 0, marginTop: 1 }} />
              Cada conta cadastrada aqui vira uma opção de <b>Categoria</b> ao criar um lançamento em
              "Contas a Pagar/Receber" — e escolher ela já define sozinho se é Entrada ou Saída. A
              classificação Fixo/Variável é usada no cálculo do Ponto de Equilíbrio.
            </p>

            <button onClick={() => setShowAccountForm((v) => !v)} style={styles.newButton}>
              <Plus size={16} /> Nova conta
            </button>

            {showAccountForm && (
              <form onSubmit={handleCreateAccount} style={{ ...styles.form, marginTop: 14 }}>
                <label style={styles.label}>Nome da conta *</label>
                <input
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  style={styles.input}
                  placeholder="Ex: ENERGIA, COMISSÃO_VENDA"
                  required
                />
                <div style={styles.row}>
                  <div style={{ flex: 1 }}>
                    <label style={styles.label}>Tipo</label>
                    <select value={accountType} onChange={(e) => setAccountType(e.target.value)} style={styles.input}>
                      <option value="despesa">Despesa</option>
                      <option value="receita">Receita</option>
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={styles.label}>Classificação</label>
                    <select value={accountClassification} onChange={(e) => setAccountClassification(e.target.value)} style={styles.input}>
                      <option value="fixo">Fixo</option>
                      <option value="variavel">Variável</option>
                    </select>
                  </div>
                </div>
                <button type="submit" style={styles.saveButton} disabled={savingAccount}>
                  {savingAccount ? "Salvando…" : "Cadastrar conta"}
                </button>
              </form>
            )}

            {chartOfAccounts.length === 0 ? (
              <p style={styles.empty}>Nenhuma conta cadastrada ainda.</p>
            ) : (
              <div style={{ ...styles.tableWrap, marginTop: 16 }}>
                <table>
                  <thead>
                    <tr>
                      <th style={styles.th}>Nome da Conta</th>
                      <th style={styles.th}>Tipo</th>
                      <th style={styles.th}>Classificação</th>
                      <th style={styles.th}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chartOfAccounts.map((acc) => (
                      <tr key={acc.id} style={{ ...styles.tr, ...(acc.active === false ? { opacity: 0.5 } : {}) }}>
                        <td style={styles.td}>{acc.name}</td>
                        <td style={styles.td}>
                          <select
                            value={acc.type}
                            onChange={(e) => handleUpdateAccount(acc.id, "type", e.target.value)}
                            style={{ ...styles.inlineSelect, ...(acc.type === "receita" ? styles.typeIn : styles.typeOut) }}
                          >
                            <option value="receita">Receita</option>
                            <option value="despesa">Despesa</option>
                          </select>
                        </td>
                        <td style={styles.td}>
                          <select
                            value={acc.classification}
                            onChange={(e) => handleUpdateAccount(acc.id, "classification", e.target.value)}
                            style={styles.inlineSelect}
                          >
                            <option value="fixo">Fixo</option>
                            <option value="variavel">Variável</option>
                          </select>
                        </td>
                        <td style={styles.td}>
                          <button
                            onClick={() => handleUpdateAccount(acc.id, "active", acc.active === false)}
                            style={styles.baixaButton}
                          >
                            {acc.active === false ? "Ativar" : "Desativar"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {tab === "dre" && (
          <>
            <div style={styles.filters}>
              <select value={drePeriodType} onChange={(e) => setDrePeriodType(e.target.value)} style={styles.filterInput}>
                <option value="mensal">Mensal</option>
                <option value="anual">Anual</option>
                <option value="personalizado">Período personalizado</option>
              </select>

              {drePeriodType === "mensal" && (
                <input type="month" value={dreMonth} onChange={(e) => setDreMonth(e.target.value)} style={styles.filterInput} />
              )}
              {drePeriodType === "anual" && (
                <input type="number" value={dreYear} onChange={(e) => setDreYear(e.target.value)} style={{ ...styles.filterInput, width: 100 }} placeholder="Ano" />
              )}
              {drePeriodType === "personalizado" && (
                <>
                  <input type="date" value={dreStart} onChange={(e) => setDreStart(e.target.value)} style={styles.filterInput} />
                  <input type="date" value={dreEnd} onChange={(e) => setDreEnd(e.target.value)} style={styles.filterInput} />
                </>
              )}

              <select value={dreRegime} onChange={(e) => setDreRegime(e.target.value)} style={styles.filterInput}>
                <option value="competencia">Regime de Competência</option>
                <option value="caixa">Regime de Caixa</option>
              </select>
            </div>

            <p style={styles.dreExplainer}>
              <Info size={13} style={{ flexShrink: 0, marginTop: 1 }} />
              {dreRegime === "competencia"
                ? "Competência: conta tudo que venceu no período, mesmo que ainda não tenha sido pago ou recebido."
                : "Caixa: conta só o que já foi efetivamente baixado (dinheiro que realmente entrou ou saiu) no período."}
            </p>

            {dreLoading || !dreData ? (
              <p style={styles.empty}>Calculando…</p>
            ) : (
              <div style={styles.dreCard}>
                <div style={styles.dreRow}>
                  <span style={styles.dreLabel}>Receita de Vendas</span>
                  <span style={styles.dreValue}>{fmt(dreData.receitaVendas)}</span>
                </div>
                <p style={styles.dreNote}>{dreData.vendasCount} venda(s) considerada(s) no período</p>

                <div style={styles.dreRow}>
                  <span style={styles.dreLabelMinus}>(-) Custo dos Produtos Vendidos (CMV)</span>
                  <span style={styles.dreValueMinus}>{fmt(dreData.cmv)}</span>
                </div>

                <div style={{ ...styles.dreRow, ...styles.dreSubtotal }}>
                  <span style={styles.dreLabelBold}>= Lucro Bruto</span>
                  <span style={styles.dreValueBold}>
                    {fmt(dreData.lucroBruto)}
                    {dreData.margemBruta !== null && <span style={styles.dreMargin}> ({dreData.margemBruta.toFixed(1)}%)</span>}
                  </span>
                </div>

                <div style={styles.dreRow}>
                  <span style={styles.dreLabel}>(+) Outras Receitas</span>
                  <span style={styles.dreValue}>{fmt(dreData.outrasReceitas)}</span>
                </div>

                <div style={styles.dreRow}>
                  <span style={styles.dreLabelMinus}>(-) Despesas</span>
                  <span style={styles.dreValueMinus}>{fmt(dreData.totalDespesas)}</span>
                </div>

                {Object.keys(dreData.despesasPorCategoria).length > 0 && (
                  <div style={styles.despesasBreakdown}>
                    {Object.entries(dreData.despesasPorCategoria).map(([cat, val]) => (
                      <div key={cat} style={styles.despesaItem}>
                        <span>{cat}</span>
                        <span>{fmt(val)}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ ...styles.dreRow, ...styles.dreFinal, ...(dreData.resultado >= 0 ? styles.dreFinalPositive : styles.dreFinalNegative) }}>
                  <span style={styles.dreLabelFinal}>= Resultado do Período ({dreData.resultado >= 0 ? "Lucro" : "Prejuízo"})</span>
                  <span style={styles.dreValueFinal}>
                    {fmt(dreData.resultado)}
                    {dreData.margemLiquida !== null && <span style={styles.dreMarginFinal}> ({dreData.margemLiquida.toFixed(1)}%)</span>}
                  </span>
                </div>
              </div>
            )}
          </>
        )}

        {tab === "equilibrio" && (
          <>
            <p style={styles.dreExplainer}>
              <Info size={13} style={{ flexShrink: 0, marginTop: 1 }} />
              Ponto de equilíbrio é o quanto você precisa faturar pra pagar tudo — sem lucro, mas
              também sem prejuízo. Custos <b>fixos</b> não mudam com a venda (aluguel, salário fixo);
              custos <b>variáveis</b> crescem junto com ela (produto vendido, comissão, frete).
            </p>

            <div style={styles.filters}>
              <select value={pePeriodType} onChange={(e) => setPePeriodType(e.target.value)} style={styles.filterInput}>
                <option value="mensal">Mensal</option>
                <option value="anual">Anual</option>
                <option value="personalizado">Período personalizado</option>
              </select>
              {pePeriodType === "mensal" && <input type="month" value={peMonth} onChange={(e) => setPeMonth(e.target.value)} style={styles.filterInput} />}
              {pePeriodType === "anual" && <input type="number" value={peYear} onChange={(e) => setPeYear(e.target.value)} style={{ ...styles.filterInput, width: 100 }} />}
              {pePeriodType === "personalizado" && (
                <>
                  <input type="date" value={peStart} onChange={(e) => setPeStart(e.target.value)} style={styles.filterInput} />
                  <input type="date" value={peEnd} onChange={(e) => setPeEnd(e.target.value)} style={styles.filterInput} />
                </>
              )}
              <input
                type="number" step="0.01" min="0" value={desiredProfit}
                onChange={(e) => setDesiredProfit(e.target.value)}
                placeholder="Lucro desejado (R$, opcional)"
                style={{ ...styles.filterInput, width: 220 }}
              />
            </div>

            {categories.length === 0 && (
              <p style={styles.warnNote}>
                Nenhuma conta cadastrada no <button onClick={() => setTab("plano")} style={styles.inlineLinkButton}>Plano de Contas</button> ainda — cadastre suas categorias de despesa lá primeiro, marcando cada uma como Fixa ou Variável.
              </p>
            )}

            {peLoading || !peData ? (
              <p style={styles.empty}>Calculando…</p>
            ) : peData.margemContribuicaoPct <= 0 ? (
              <p style={styles.empty}>
                Não é possível calcular: a margem de contribuição está zerada ou negativa nesse
                período (os custos variáveis consomem toda a receita). Confira a classificação das
                categorias ou o período escolhido.
              </p>
            ) : (
              <>
                <div style={styles.statsRow}>
                  <div style={styles.statCard}>
                    <div style={{ ...styles.statIcon, background: "#fef2f2" }}><TrendingDown size={16} color="#dc2626" /></div>
                    <div><div style={styles.statValue}>{fmt(peData.custosFixosTotais)}</div><div style={styles.statLabel}>Custos fixos do período</div></div>
                  </div>
                  <div style={styles.statCard}>
                    <div style={{ ...styles.statIcon, background: "#fef3c7" }}><TrendingDown size={16} color="#d97706" /></div>
                    <div><div style={styles.statValue}>{fmt(peData.custosVariaveisTotais)}</div><div style={styles.statLabel}>Custos variáveis (CMV + despesas)</div></div>
                  </div>
                  <div style={styles.statCard}>
                    <div style={{ ...styles.statIcon, background: "#f0fdf4" }}><TrendingUp size={16} color="#16a34a" /></div>
                    <div>
                      <div style={styles.statValue}>{fmt(peData.margemContribuicao)}</div>
                      <div style={styles.statLabel}>Margem de contribuição ({(peData.margemContribuicaoPct * 100).toFixed(1)}%)</div>
                    </div>
                  </div>
                </div>

                <div style={styles.peResultRow}>
                  <div style={styles.peResultCard}>
                    <span style={styles.peResultLabel}>Ponto de Equilíbrio (sem lucro nem prejuízo)</span>
                    <span style={styles.peResultValue}>{fmt(peData.peContabil)}</span>
                    {peData.ticketMedio > 0 && (
                      <span style={styles.peResultSub}>
                        ≈ {Math.ceil(peData.peContabil / peData.ticketMedio)} venda(s), considerando um ticket médio de {fmt(peData.ticketMedio)}
                      </span>
                    )}
                  </div>
                  {peData.lucroDesejadoNum > 0 && (
                    <div style={{ ...styles.peResultCard, background: "#eff6ff", borderColor: "#bfdbfe" }}>
                      <span style={{ ...styles.peResultLabel, color: "#1d4ed8" }}>Faturamento necessário para o lucro desejado</span>
                      <span style={{ ...styles.peResultValue, color: "#1d4ed8" }}>{fmt(peData.peEconomico)}</span>
                      <span style={styles.peResultSub}>Lucro desejado: {fmt(peData.lucroDesejadoNum)}</span>
                    </div>
                  )}
                </div>

                <div style={styles.chartCard}>
                  <BreakEvenChart
                    fixedCosts={peData.custosFixosTotais}
                    variableCostRate={peData.variableCostRate}
                    breakEvenValue={peData.peContabil}
                  />
                </div>
              </>
            )}
          </>
        )}
      </div>

      {detailTransaction && (
        <TransactionDetailModal
          transaction={detailTransaction}
          chartOfAccounts={chartOfAccounts}
          onClose={() => setDetailTransaction(null)}
          onChanged={loadTransactions}
        />
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
  dreExplainer: { display: "flex", gap: 6, fontSize: 12, color: "#737373", background: "#fafafa", border: "1px solid #e5e5e5", borderRadius: 10, padding: "9px 12px", marginBottom: 18 },
  dreCard: { background: "#fff", border: "1px solid #e5e5e5", borderRadius: 16, padding: "20px 24px", maxWidth: 620 },
  dreRow: { display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "8px 0" },
  dreLabel: { fontSize: 14, color: "#171717" },
  dreValue: { fontSize: 14, fontWeight: 700, color: "#16a34a" },
  dreLabelMinus: { fontSize: 14, color: "#525252" },
  dreValueMinus: { fontSize: 14, fontWeight: 700, color: "#dc2626" },
  dreLabelBold: { fontSize: 15, fontWeight: 800, color: "#171717" },
  dreValueBold: { fontSize: 15, fontWeight: 800, color: "#171717" },
  dreSubtotal: { borderTop: "1px solid #e5e5e5", borderBottom: "1px solid #e5e5e5", margin: "6px 0" },
  dreMargin: { fontSize: 12, color: "#a3a3a3", fontWeight: 500 },
  dreNote: { fontSize: 11, color: "#a3a3a3", marginTop: -4, marginBottom: 4 },
  despesasBreakdown: { background: "#fafafa", borderRadius: 10, padding: "8px 14px", margin: "4px 0 8px" },
  despesaItem: { display: "flex", justifyContent: "space-between", fontSize: 12, color: "#737373", padding: "4px 0" },
  dreFinal: { borderRadius: 12, padding: "14px 16px", marginTop: 10 },
  dreFinalPositive: { background: "#f0fdf4" },
  dreFinalNegative: { background: "#fef2f2" },
  dreLabelFinal: { fontSize: 15, fontWeight: 800, color: "#171717" },
  dreValueFinal: { fontSize: 19, fontWeight: 800, color: "#171717" },
  dreMarginFinal: { fontSize: 13, color: "#737373", fontWeight: 600 },
  classifyBox: { background: "#fff", border: "1px solid #e5e5e5", borderRadius: 14, padding: 16, marginBottom: 18, maxWidth: 560 },
  classifyTitle: { display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, marginBottom: 2 },
  classifyHelp: { fontSize: 11.5, color: "#a3a3a3", marginBottom: 10 },
  classifyList: { display: "flex", flexDirection: "column", gap: 6 },
  classifyRow: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 },
  classifyCat: { fontSize: 12.5, color: "#171717", fontWeight: 500 },
  classifyToggle: { display: "flex", gap: 4 },
  classifyButton: { border: "1px solid #e5e5e5", background: "#fafafa", borderRadius: 8, padding: "5px 12px", fontSize: 11.5, fontWeight: 600, cursor: "pointer", color: "#a3a3a3" },
  classifyButtonActiveFixo: { background: "#fef2f2", borderColor: "#fecaca", color: "#dc2626" },
  classifyButtonActiveVar: { background: "#fef3c7", borderColor: "#fde68a", color: "#d97706" },
  peResultRow: { display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 18 },
  peResultCard: { flex: "1 1 260px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 14, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 4 },
  peResultLabel: { fontSize: 12, fontWeight: 700, color: "#166534" },
  peResultValue: { fontSize: 24, fontWeight: 800, color: "#14532d" },
  peResultSub: { fontSize: 11, color: "#737373" },
  chartCard: { background: "#fff", border: "1px solid #e5e5e5", borderRadius: 16, padding: 20, display: "flex", justifyContent: "center" },
  autoTypeBox: { border: "1px solid #e5e5e5", borderRadius: 10, padding: "9px 12px", background: "#fafafa", display: "flex", alignItems: "center" },
  warnNote: { fontSize: 12, color: "#d97706", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "9px 12px", marginTop: 10 },
  inlineLinkButton: { border: "none", background: "none", color: "#171717", fontWeight: 700, textDecoration: "underline", cursor: "pointer", padding: 0, font: "inherit" },
  inlineSelect: { border: "1px solid #e5e5e5", borderRadius: 8, padding: "5px 8px", fontSize: 12, fontWeight: 600 },
};

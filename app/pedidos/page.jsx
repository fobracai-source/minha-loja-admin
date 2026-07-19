"use client";

import { useEffect, useState } from "react";
import AuthGate from "../../components/AuthGate";
import Sidebar from "../../components/Sidebar";
import { supabase } from "../../lib/supabaseClient";
import { Download } from "lucide-react";

const STATUS_OPTIONS = ["pendente", "confirmado", "enviado", "entregue", "cancelado"];

function todayDateInput() {
  return new Date().toISOString().slice(0, 10);
}

function PedidosContent() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState(todayDateInput());
  const [statusFilter, setStatusFilter] = useState("todos");

  async function loadOrders() {
    setLoading(true);
    let query = supabase
      .from("orders")
      .select("*, customers(name, email), order_items(product_name, unit_price, quantity)")
      .order("created_at", { ascending: false });

    if (startDate) query = query.gte("created_at", `${startDate}T00:00:00`);
    if (endDate) query = query.lte("created_at", `${endDate}T23:59:59`);
    if (statusFilter !== "todos") query = query.eq("status", statusFilter);

    const { data } = await query;
    setOrders(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleStatusChange(orderId, newStatus) {
    await supabase.from("orders").update({ status: newStatus }).eq("id", orderId);
    loadOrders();
  }

  const totalPeriodo = orders.reduce((sum, o) => sum + Number(o.total), 0);

  function exportCSV() {
    const rows = [
      ["Nº Pedido", "Data/Hora", "Cliente", "Status", "Forma de Pagamento", "Subtotal", "Frete", "Total", "Observação"],
      ...orders.map((o) => [
        o.order_number,
        new Date(o.created_at).toLocaleString("pt-BR"),
        o.customers?.name || "—",
        o.status,
        o.payment_method,
        Number(o.subtotal).toFixed(2),
        Number(o.shipping_cost).toFixed(2),
        Number(o.total).toFixed(2),
        o.notes || "",
      ]),
    ];

    const csvContent = rows.map((r) => r.join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `relatorio-pedidos-${startDate || "inicio"}-a-${endDate || "hoje"}.csv`;
    link.click();
  }

  return (
    <div>
      <Sidebar />
      <div style={styles.content}>
        <h1 style={styles.title}>Pedidos</h1>
        <p style={styles.subtitle}>Filtre por data e gere relatórios</p>

        <div style={styles.filters}>
          <div>
            <label style={styles.filterLabel}>De</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={styles.input} />
          </div>
          <div>
            <label style={styles.filterLabel}>Até</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={styles.input} />
          </div>
          <div>
            <label style={styles.filterLabel}>Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={styles.input}>
              <option value="todos">Todos</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <button onClick={loadOrders} style={styles.filterButton}>Filtrar</button>
          <button onClick={exportCSV} style={styles.exportButton}>
            <Download size={14} /> Exportar CSV
          </button>
        </div>

        <div style={styles.summary}>
          <span>{orders.length} pedido(s) no período</span>
          <span style={styles.summaryTotal}>Total: R$ {totalPeriodo.toFixed(2).replace(".", ",")}</span>
        </div>

        {loading ? (
          <p style={styles.empty}>Carregando…</p>
        ) : orders.length === 0 ? (
          <p style={styles.empty}>Nenhum pedido encontrado nesse filtro.</p>
        ) : (
          <div style={styles.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th style={styles.th}>Nº</th>
                  <th style={styles.th}>Data/Hora</th>
                  <th style={styles.th}>Cliente</th>
                  <th style={styles.th}>Itens</th>
                  <th style={styles.th}>Pagamento</th>
                  <th style={styles.th}>Total</th>
                  <th style={styles.th}>Obs.</th>
                  <th style={styles.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} style={styles.tr}>
                    <td style={styles.td}>#{o.order_number}</td>
                    <td style={styles.td}>{new Date(o.created_at).toLocaleString("pt-BR")}</td>
                    <td style={styles.td}>{o.customers?.name || "—"}</td>
                    <td style={styles.td}>{o.order_items?.length || 0} item(ns)</td>
                    <td style={styles.td}>{o.payment_method}</td>
                    <td style={styles.td}>R$ {Number(o.total).toFixed(2).replace(".", ",")}</td>
                    <td style={{ ...styles.td, maxWidth: 160, whiteSpace: "normal" }}>{o.notes || "—"}</td>
                    <td style={styles.td}>
                      <select
                        value={o.status}
                        onChange={(e) => handleStatusChange(o.id, e.target.value)}
                        style={styles.statusSelect}
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
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

export default function PedidosPage() {
  return (
    <AuthGate>
      <PedidosContent />
    </AuthGate>
  );
}

const styles = {
  content: { padding: "24px 20px", maxWidth: 1100, margin: "0 auto" },
  title: { fontSize: 22, fontWeight: 700 },
  subtitle: { fontSize: 13, color: "#737373", marginBottom: 20 },
  filters: { display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 14 },
  filterLabel: { fontSize: 11, fontWeight: 600, color: "#525252", marginBottom: 4, display: "block" },
  input: { border: "1px solid #e5e5e5", borderRadius: 10, padding: "9px 10px", outline: "none" },
  filterButton: {
    border: "1px solid #e5e5e5", background: "#fff", borderRadius: 10,
    padding: "9px 16px", fontWeight: 600, fontSize: 13, cursor: "pointer",
  },
  exportButton: {
    display: "flex", alignItems: "center", gap: 6,
    border: "none", background: "#171717", color: "#fff", borderRadius: 10,
    padding: "9px 16px", fontWeight: 600, fontSize: 13, cursor: "pointer",
  },
  summary: {
    display: "flex", justifyContent: "space-between", fontSize: 13, color: "#737373",
    marginBottom: 12, padding: "0 2px",
  },
  summaryTotal: { fontWeight: 700, color: "#171717" },
  empty: { color: "#a3a3a3", fontSize: 13, padding: 24, textAlign: "center" },
  tableWrap: { background: "#fff", border: "1px solid #e5e5e5", borderRadius: 14, overflow: "auto" },
  th: { textAlign: "left", fontSize: 11, color: "#a3a3a3", textTransform: "uppercase", padding: "12px 14px", borderBottom: "1px solid #f0f0f0" },
  tr: { borderBottom: "1px solid #f5f5f5" },
  td: { padding: "10px 14px", fontSize: 13, verticalAlign: "middle" },
  statusSelect: { border: "1px solid #e5e5e5", borderRadius: 8, padding: "5px 8px", fontSize: 12 },
};

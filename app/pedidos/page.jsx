"use client";

import { useEffect, useState } from "react";
import AuthGate from "../../components/AuthGate";
import Sidebar from "../../components/Sidebar";
import { supabase } from "../../lib/supabaseClient";
import { Download, Truck, X } from "lucide-react";

const DELIVERY_STATUS_LABELS = {
  aguardando_separacao: "Aguardando Separação",
  em_separacao: "Em Separação",
  saiu_para_entrega: "Saiu para Entrega",
  entregue: "Entregue",
  problema: "Problema na Entrega",
};

const DELIVERY_PAYMENT_LABELS = {
  dinheiro: "Dinheiro",
  cartao_credito: "Cartão de Crédito",
  cartao_debito: "Cartão de Débito",
  pix: "Pix",
  combinado: "Pagamento combinado",
};

function todayDateInput() {
  return new Date().toISOString().slice(0, 10);
}

function getDeliveryStatus(order) {
  const d = Array.isArray(order.deliveries) ? order.deliveries[0] : order.deliveries;
  return d?.status || "aguardando_separacao";
}

function fmtMoney(v) {
  return `R$ ${Number(v || 0).toFixed(2).replace(".", ",")}`;
}

function PedidosContent() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState(todayDateInput());
  const [statusFilter, setStatusFilter] = useState("todos");
  const [detailOrder, setDetailOrder] = useState(null);

  async function loadOrders() {
    setLoading(true);
    let query = supabase
      .from("orders")
      .select("*, customers(name, email, phone, street, street_number, complement, neighborhood, city, state, zip_code, reference_point), order_items(product_name, unit_price, quantity), deliveries(status, tracking_code, carrier, estimated_date)")
      .order("created_at", { ascending: false });

    if (startDate) query = query.gte("created_at", `${startDate}T00:00:00`);
    if (endDate) query = query.lte("created_at", `${endDate}T23:59:59`);

    const { data } = await query;
    setOrders(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredOrders = orders.filter(
    (o) => statusFilter === "todos" || getDeliveryStatus(o) === statusFilter
  );

  const totalPeriodo = filteredOrders.reduce((sum, o) => sum + Number(o.total), 0);

  function exportCSV() {
    const rows = [
      ["Nº Pedido", "Data/Hora", "Cliente", "Status de Entrega", "Forma de Pagamento", "Subtotal", "Frete", "Total", "Observação"],
      ...filteredOrders.map((o) => [
        o.order_number,
        new Date(o.created_at).toLocaleString("pt-BR"),
        o.customers?.name || "—",
        DELIVERY_STATUS_LABELS[getDeliveryStatus(o)] || getDeliveryStatus(o),
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

  function enderecoFormatado(c) {
    if (!c) return "—";
    const linha1 = [c.street, c.street_number].filter(Boolean).join(", ");
    const linha2 = [c.neighborhood, c.city && c.state ? `${c.city} - ${c.state}` : c.city].filter(Boolean).join(", ");
    return [linha1, c.complement, linha2, c.zip_code].filter(Boolean);
  }

  return (
    <div>
      <Sidebar />
      <div style={styles.content}>
        <h1 style={styles.title}>Vendas</h1>
        <p style={styles.subtitle}>Filtre por data, gere relatórios e clique num pedido para ver os detalhes</p>

        <div style={styles.infoBox}>
          <Truck size={14} color="#525252" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={styles.infoText}>
            O status de entrega mostrado aqui é só leitura — quem controla é a aba{" "}
            <a href="/logistica" style={styles.infoLink}>Logística</a>. É lá que você atualiza o
            andamento de cada pedido.
          </p>
        </div>

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
            <label style={styles.filterLabel}>Status de entrega</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={styles.input}>
              <option value="todos">Todos</option>
              {Object.entries(DELIVERY_STATUS_LABELS).map(([id, label]) => (
                <option key={id} value={id}>{label}</option>
              ))}
            </select>
          </div>
          <button onClick={loadOrders} style={styles.filterButton}>Filtrar</button>
          <button onClick={exportCSV} style={styles.exportButton}>
            <Download size={14} /> Exportar CSV
          </button>
        </div>

        <div style={styles.summary}>
          <span>{filteredOrders.length} pedido(s) no período</span>
          <span style={styles.summaryTotal}>Total: {fmtMoney(totalPeriodo)}</span>
        </div>

        {loading ? (
          <p style={styles.empty}>Carregando…</p>
        ) : filteredOrders.length === 0 ? (
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
                  <th style={styles.th}>Status de entrega</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((o) => {
                  const deliveryStatus = getDeliveryStatus(o);
                  return (
                    <tr key={o.id} style={{ ...styles.tr, cursor: "pointer" }} onClick={() => setDetailOrder(o)}>
                      <td style={styles.td}>#{o.order_number}</td>
                      <td style={styles.td}>{new Date(o.created_at).toLocaleString("pt-BR")}</td>
                      <td style={styles.td}>{o.customers?.name || "—"}</td>
                      <td style={styles.td}>{o.order_items?.length || 0} item(ns)</td>
                      <td style={styles.td}>{o.payment_method}</td>
                      <td style={styles.td}>{fmtMoney(o.total)}</td>
                      <td style={{ ...styles.td, maxWidth: 160, whiteSpace: "normal" }}>{o.notes || "—"}</td>
                      <td style={styles.td}>
                        <span style={{ ...styles.statusBadge, ...(deliveryStatus === "entregue" ? styles.statusDone : deliveryStatus === "problema" ? styles.statusProblem : {}) }}>
                          {DELIVERY_STATUS_LABELS[deliveryStatus] || deliveryStatus}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {detailOrder && (
        <div style={styles.modalOverlay} onClick={() => setDetailOrder(null)}>
          <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Pedido #{detailOrder.order_number}</h2>
              <button onClick={() => setDetailOrder(null)} style={styles.modalClose}><X size={18} /></button>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.modalSection}>
                <span style={styles.modalSectionTitle}>Cliente</span>
                <p style={styles.modalText}>{detailOrder.customers?.name || "—"}</p>
                <p style={styles.modalTextMuted}>{detailOrder.customers?.phone} {detailOrder.customers?.email ? `· ${detailOrder.customers.email}` : ""}</p>
              </div>

              <div style={styles.modalSection}>
                <span style={styles.modalSectionTitle}>Endereço de entrega</span>
                {enderecoFormatado(detailOrder.customers).map((linha, i) => (
                  <p key={i} style={styles.modalText}>{linha}</p>
                ))}
                {detailOrder.customers?.reference_point && (
                  <p style={styles.modalTextMuted}>Referência: {detailOrder.customers.reference_point}</p>
                )}
              </div>

              <div style={styles.modalSection}>
                <span style={styles.modalSectionTitle}>Itens</span>
                {(detailOrder.order_items || []).map((item, i) => (
                  <div key={i} style={styles.modalItemRow}>
                    <span>{item.quantity}x {item.product_name}</span>
                    <span>{fmtMoney(item.unit_price * item.quantity)}</span>
                  </div>
                ))}
              </div>

              <div style={styles.modalSection}>
                <span style={styles.modalSectionTitle}>Pagamento</span>
                <p style={styles.modalText}>
                  {detailOrder.payment_method === "cod" ? "Pagar na Entrega" : detailOrder.payment_method}
                  {detailOrder.delivery_payment_options?.length > 0 && (
                    ` — ${detailOrder.delivery_payment_options.map((id) => DELIVERY_PAYMENT_LABELS[id] || id).join(" + ")}`
                  )}
                </p>
                {detailOrder.coupon_code && <p style={styles.modalTextMuted}>Cupom: {detailOrder.coupon_code} (-{fmtMoney(detailOrder.discount_amount)})</p>}
              </div>

              <div style={styles.modalSection}>
                <span style={styles.modalSectionTitle}>Entrega</span>
                <p style={styles.modalText}>{DELIVERY_STATUS_LABELS[getDeliveryStatus(detailOrder)]}</p>
                {(() => {
                  const d = Array.isArray(detailOrder.deliveries) ? detailOrder.deliveries[0] : detailOrder.deliveries;
                  if (!d) return null;
                  return (
                    <>
                      {d.carrier && <p style={styles.modalTextMuted}>Transportadora: {d.carrier}</p>}
                      {d.tracking_code && <p style={styles.modalTextMuted}>Rastreio: {d.tracking_code}</p>}
                    </>
                  );
                })()}
              </div>

              {detailOrder.notes && (
                <div style={styles.modalSection}>
                  <span style={styles.modalSectionTitle}>Observação do cliente</span>
                  <p style={styles.modalText}>{detailOrder.notes}</p>
                </div>
              )}

              <div style={styles.modalTotalBox}>
                <div style={styles.modalTotalRow}><span>Subtotal</span><span>{fmtMoney(detailOrder.subtotal)}</span></div>
                <div style={styles.modalTotalRow}><span>Frete</span><span>{fmtMoney(detailOrder.shipping_cost)}</span></div>
                {detailOrder.discount_amount > 0 && (
                  <div style={styles.modalTotalRow}><span>Desconto</span><span>-{fmtMoney(detailOrder.discount_amount)}</span></div>
                )}
                <div style={{ ...styles.modalTotalRow, ...styles.modalTotalFinal }}><span>Total</span><span>{fmtMoney(detailOrder.total)}</span></div>
              </div>
            </div>
          </div>
        </div>
      )}
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
  subtitle: { fontSize: 13, color: "#737373", marginBottom: 14 },
  infoBox: {
    display: "flex", gap: 8, background: "#fafafa", border: "1px solid #e5e5e5",
    borderRadius: 12, padding: 12, marginBottom: 16,
  },
  infoText: { fontSize: 12, color: "#525252", lineHeight: 1.5 },
  infoLink: { color: "#171717", fontWeight: 700, textDecoration: "underline" },
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
  statusBadge: { fontSize: 11.5, fontWeight: 600, padding: "4px 10px", borderRadius: 999, background: "#f0f0f0", color: "#525252" },
  statusDone: { background: "#dcfce7", color: "#16a34a" },
  statusProblem: { background: "#fef2f2", color: "#dc2626" },
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 },
  modalCard: { background: "#fff", borderRadius: 16, width: "100%", maxWidth: 480, maxHeight: "85vh", display: "flex", flexDirection: "column" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 18px", borderBottom: "1px solid #f0f0f0" },
  modalTitle: { fontSize: 16, fontWeight: 800, margin: 0 },
  modalClose: { background: "#f5f5f5", border: "none", width: 30, height: 30, borderRadius: 15, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" },
  modalBody: { padding: "16px 18px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 },
  modalSection: { display: "flex", flexDirection: "column", gap: 2 },
  modalSectionTitle: { fontSize: 10.5, fontWeight: 700, color: "#a3a3a3", textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 3 },
  modalText: { fontSize: 13.5, color: "#171717", margin: 0 },
  modalTextMuted: { fontSize: 12, color: "#a3a3a3", margin: 0 },
  modalItemRow: { display: "flex", justifyContent: "space-between", fontSize: 13, padding: "3px 0" },
  modalTotalBox: { background: "#fafafa", borderRadius: 10, padding: "10px 14px", display: "flex", flexDirection: "column", gap: 3 },
  modalTotalRow: { display: "flex", justifyContent: "space-between", fontSize: 12.5, color: "#525252" },
  modalTotalFinal: { fontWeight: 800, fontSize: 14, color: "#171717", borderTop: "1px solid #e5e5e5", paddingTop: 6, marginTop: 3 },
};

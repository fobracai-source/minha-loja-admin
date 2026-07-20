"use client";

import { useEffect, useState } from "react";
import { X, ShoppingBag, Tag as TagIcon } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

export default function TransactionDetailModal({ transaction, onClose }) {
  const [order, setOrder] = useState(null);
  const [loadingOrder, setLoadingOrder] = useState(false);

  useEffect(() => {
    async function loadOrder() {
      if (!transaction?.order_id) return;
      setLoadingOrder(true);
      const { data } = await supabase
        .from("orders")
        .select("*, customers(name, phone, address), order_items(product_name, quantity, unit_price)")
        .eq("id", transaction.order_id)
        .single();
      setOrder(data);
      setLoadingOrder(false);
    }
    loadOrder();
  }, [transaction]);

  if (!transaction) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>Detalhes do lançamento</h2>
          <button onClick={onClose} style={styles.closeButton}><X size={18} /></button>
        </div>

        <div style={styles.body}>
          <div style={styles.row}>
            <span style={styles.label}>Descrição</span>
            <span style={styles.value}>{transaction.description}</span>
          </div>
          <div style={styles.row}>
            <span style={styles.label}>Tipo</span>
            <span style={{ ...styles.badge, ...(transaction.type === "entrada" ? styles.badgeIn : styles.badgeOut) }}>
              {transaction.type === "entrada" ? "Entrada" : "Saída"}
            </span>
          </div>
          {transaction.category && (
            <div style={styles.row}>
              <span style={styles.label}>Categoria</span>
              <span style={styles.categoryTag}><TagIcon size={11} /> {transaction.category}</span>
            </div>
          )}
          <div style={styles.row}>
            <span style={styles.label}>Valor</span>
            <span style={styles.valueStrong}>R$ {Number(transaction.amount).toFixed(2).replace(".", ",")}</span>
          </div>
          <div style={styles.row}>
            <span style={styles.label}>Vencimento</span>
            <span style={styles.value}>{new Date(transaction.due_date + "T00:00:00").toLocaleDateString("pt-BR")}</span>
          </div>
          <div style={styles.row}>
            <span style={styles.label}>Status</span>
            <span style={{ ...styles.badge, ...(transaction.status === "baixado" ? styles.badgeDone : styles.badgePending) }}>
              {transaction.status === "baixado" ? "Baixado" : "Pendente"}
            </span>
          </div>
          {transaction.payment_date && (
            <div style={styles.row}>
              <span style={styles.label}>Data da baixa</span>
              <span style={styles.value}>{new Date(transaction.payment_date + "T00:00:00").toLocaleDateString("pt-BR")}</span>
            </div>
          )}
          {transaction.settlement_group_id && (
            <div style={styles.row}>
              <span style={styles.label}>Baixa em lote</span>
              <span style={styles.value}>Sim — junto com outras contas</span>
            </div>
          )}
          <div style={styles.row}>
            <span style={styles.label}>Origem</span>
            <span style={styles.value}>{transaction.origin === "pedido_entregue" ? "Gerado automaticamente (pedido entregue)" : "Lançamento manual"}</span>
          </div>

          {transaction.order_id && (
            <div style={styles.orderSection}>
              <div style={styles.orderHeader}>
                <ShoppingBag size={14} color="#171717" />
                <span style={styles.orderTitle}>Pedido vinculado</span>
              </div>
              {loadingOrder ? (
                <p style={styles.muted}>Carregando…</p>
              ) : order ? (
                <>
                  <div style={styles.row}>
                    <span style={styles.label}>Nº do pedido</span>
                    <span style={styles.value}>#{order.order_number}</span>
                  </div>
                  <div style={styles.row}>
                    <span style={styles.label}>Cliente</span>
                    <span style={styles.value}>{order.customers?.name || "—"}</span>
                  </div>
                  {order.customers?.phone && (
                    <div style={styles.row}>
                      <span style={styles.label}>Telefone</span>
                      <span style={styles.value}>{order.customers.phone}</span>
                    </div>
                  )}
                  {order.customers?.address && (
                    <div style={styles.row}>
                      <span style={styles.label}>Endereço</span>
                      <span style={styles.value}>{order.customers.address}</span>
                    </div>
                  )}
                  <div style={{ marginTop: 8 }}>
                    <span style={styles.label}>Itens</span>
                    <ul style={styles.itemsList}>
                      {order.order_items?.map((item, i) => (
                        <li key={i} style={styles.itemRow}>
                          {item.quantity}x {item.product_name} — R$ {Number(item.unit_price).toFixed(2).replace(".", ",")}
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              ) : (
                <p style={styles.muted}>Pedido não encontrado.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 },
  modal: { background: "#fff", borderRadius: 16, width: "100%", maxWidth: 440, maxHeight: "85vh", overflow: "auto" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid #f0f0f0" },
  title: { fontSize: 15, fontWeight: 700 },
  closeButton: { background: "none", border: "none", cursor: "pointer", color: "#737373" },
  body: { padding: "16px 20px" },
  row: { display: "flex", justifyContent: "space-between", alignItems: "center", paddingVertical: 6, marginBottom: 8, gap: 12 },
  label: { fontSize: 12, color: "#a3a3a3", fontWeight: 600, flexShrink: 0 },
  value: { fontSize: 13, color: "#171717", fontWeight: 500, textAlign: "right" },
  valueStrong: { fontSize: 15, color: "#171717", fontWeight: 800 },
  badge: { fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999 },
  badgeIn: { background: "#dcfce7", color: "#16a34a" },
  badgeOut: { background: "#fee2e2", color: "#dc2626" },
  badgeDone: { background: "#dbeafe", color: "#2563eb" },
  badgePending: { background: "#f0f0f0", color: "#737373" },
  categoryTag: { display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, background: "#f5f5f5", borderRadius: 8, padding: "3px 8px" },
  orderSection: { marginTop: 12, paddingTop: 12, borderTop: "1px solid #f0f0f0" },
  orderHeader: { display: "flex", alignItems: "center", gap: 6, marginBottom: 10 },
  orderTitle: { fontSize: 13, fontWeight: 700 },
  muted: { fontSize: 12, color: "#a3a3a3" },
  itemsList: { margin: "6px 0 0", paddingLeft: 18, display: "flex", flexDirection: "column", gap: 3 },
  itemRow: { fontSize: 12, color: "#525252" },
};

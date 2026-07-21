"use client";

import { useEffect, useState } from "react";
import { X, ShoppingBag, Tag as TagIcon, Pencil, Trash2, Save } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

export default function TransactionDetailModal({ transaction, chartOfAccounts = [], onClose, onChanged }) {
  const [order, setOrder] = useState(null);
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [description, setDescription] = useState(transaction?.description || "");
  const [category, setCategory] = useState(transaction?.category || "");
  const [amount, setAmount] = useState(transaction?.amount ?? "");
  const [dueDate, setDueDate] = useState(transaction?.due_date || "");
  const [paymentDate, setPaymentDate] = useState(transaction?.payment_date || "");
  const [status, setStatus] = useState(transaction?.status || "pendente");
  const [type, setType] = useState(transaction?.type || "entrada");

  useEffect(() => {
    setDescription(transaction?.description || "");
    setCategory(transaction?.category || "");
    setAmount(transaction?.amount ?? "");
    setDueDate(transaction?.due_date || "");
    setPaymentDate(transaction?.payment_date || "");
    setStatus(transaction?.status || "pendente");
    setType(transaction?.type || "entrada");
    setEditing(false);
    setError("");
  }, [transaction]);

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

  function handleCategoryChange(catName) {
    setCategory(catName);
    const acc = chartOfAccounts.find((a) => a.name === catName);
    if (acc) setType(acc.type === "receita" ? "entrada" : "saida");
  }

  async function handleSave() {
    if (!description.trim() || !amount || !dueDate) {
      setError("Preencha descrição, valor e vencimento.");
      return;
    }
    setSaving(true);
    setError("");

    const payload = {
      description: description.trim(),
      category: category || null,
      amount: parseFloat(amount),
      due_date: dueDate,
      status,
      type,
      payment_date: status === "baixado" ? (paymentDate || new Date().toISOString().slice(0, 10)) : null,
    };

    const { error: updateError } = await supabase.from("financial_transactions").update(payload).eq("id", transaction.id);

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setEditing(false);
    onChanged?.();
  }

  async function handleDelete() {
    if (!confirm("Excluir este lançamento? Essa ação não pode ser desfeita.")) return;
    await supabase.from("financial_transactions").delete().eq("id", transaction.id);
    onChanged?.();
    onClose();
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>{editing ? "Editar lançamento" : "Detalhes do lançamento"}</h2>
          <div style={{ display: "flex", gap: 6 }}>
            {!editing && (
              <button onClick={() => setEditing(true)} style={styles.iconHeaderButton} title="Editar">
                <Pencil size={15} />
              </button>
            )}
            <button onClick={onClose} style={styles.iconHeaderButton}><X size={18} /></button>
          </div>
        </div>

        <div style={styles.body}>
          {editing ? (
            <>
              <label style={styles.fieldLabel}>Descrição</label>
              <input value={description} onChange={(e) => setDescription(e.target.value)} style={styles.editInput} />

              <label style={styles.fieldLabel}>Categoria (Plano de Contas)</label>
              <select value={category} onChange={(e) => handleCategoryChange(e.target.value)} style={styles.editInput}>
                <option value="">Sem categoria</option>
                {chartOfAccounts.filter((a) => a.active !== false).map((a) => (
                  <option key={a.id} value={a.name}>{a.name}</option>
                ))}
              </select>

              <div style={styles.editRow}>
                <div style={{ flex: 1 }}>
                  <label style={styles.fieldLabel}>Tipo</label>
                  <div style={styles.autoTypeBox}>
                    <span style={{ ...styles.badge, ...(type === "entrada" ? styles.badgeIn : styles.badgeOut) }}>
                      {type === "entrada" ? "Entrada" : "Saída"}
                    </span>
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={styles.fieldLabel}>Valor (R$)</label>
                  <input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} style={styles.editInput} />
                </div>
              </div>

              <div style={styles.editRow}>
                <div style={{ flex: 1 }}>
                  <label style={styles.fieldLabel}>Vencimento</label>
                  <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={styles.editInput} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={styles.fieldLabel}>Status</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value)} style={styles.editInput}>
                    <option value="pendente">Pendente</option>
                    <option value="baixado">Baixado</option>
                  </select>
                </div>
              </div>

              {status === "baixado" && (
                <>
                  <label style={styles.fieldLabel}>Data da baixa</label>
                  <input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} style={styles.editInput} />
                </>
              )}

              {error && <p style={styles.errorText}>{error}</p>}

              <div style={styles.editActions}>
                <button onClick={handleDelete} style={styles.deleteButton}><Trash2 size={13} /> Excluir</button>
                <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
                  <button onClick={() => setEditing(false)} style={styles.cancelButton}>Cancelar</button>
                  <button onClick={handleSave} style={styles.saveButtonModal} disabled={saving}>
                    <Save size={13} /> {saving ? "Salvando…" : "Salvar"}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
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
                      <div style={styles.row}><span style={styles.label}>Nº do pedido</span><span style={styles.value}>#{order.order_number}</span></div>
                      <div style={styles.row}><span style={styles.label}>Cliente</span><span style={styles.value}>{order.customers?.name || "—"}</span></div>
                      {order.customers?.phone && <div style={styles.row}><span style={styles.label}>Telefone</span><span style={styles.value}>{order.customers.phone}</span></div>}
                      {order.customers?.address && <div style={styles.row}><span style={styles.label}>Endereço</span><span style={styles.value}>{order.customers.address}</span></div>}
                      <div style={{ marginTop: 8 }}>
                        <span style={styles.label}>Itens</span>
                        <ul style={styles.itemsList}>
                          {order.order_items?.map((item, i) => (
                            <li key={i} style={styles.itemRow}>{item.quantity}x {item.product_name} — R$ {Number(item.unit_price).toFixed(2).replace(".", ",")}</li>
                          ))}
                        </ul>
                      </div>
                    </>
                  ) : (
                    <p style={styles.muted}>Pedido não encontrado.</p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 },
  modal: { background: "#fff", borderRadius: 16, width: "100%", maxWidth: 440, maxHeight: "88vh", overflow: "auto" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid #f0f0f0" },
  title: { fontSize: 15, fontWeight: 700 },
  iconHeaderButton: { background: "none", border: "none", cursor: "pointer", color: "#737373", display: "flex", alignItems: "center" },
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
  fieldLabel: { fontSize: 11.5, fontWeight: 600, color: "#525252", marginBottom: 4, marginTop: 12, display: "block" },
  editInput: { border: "1px solid #e5e5e5", borderRadius: 10, padding: "9px 12px", outline: "none", width: "100%", fontSize: 13 },
  editRow: { display: "flex", gap: 10 },
  autoTypeBox: { border: "1px solid #e5e5e5", borderRadius: 10, padding: "8px 10px", background: "#fafafa" },
  errorText: { color: "#dc2626", fontSize: 12, marginTop: 10 },
  editActions: { display: "flex", alignItems: "center", marginTop: 18, gap: 8 },
  deleteButton: { display: "flex", alignItems: "center", gap: 5, border: "1px solid #fecaca", background: "#fef2f2", color: "#dc2626", borderRadius: 9, padding: "8px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" },
  cancelButton: { border: "1px solid #e5e5e5", background: "#fff", borderRadius: 9, padding: "8px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" },
  saveButtonModal: { display: "flex", alignItems: "center", gap: 5, border: "none", background: "#171717", color: "#fff", borderRadius: 9, padding: "8px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" },
};

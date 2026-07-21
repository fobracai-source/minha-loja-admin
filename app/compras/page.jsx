"use client";

import { useEffect, useMemo, useState } from "react";
import AuthGate from "../../components/AuthGate";
import Sidebar from "../../components/Sidebar";
import { supabase } from "../../lib/supabaseClient";
import { Plus, Trash2, Info, PackageCheck } from "lucide-react";

function todayDateInput() {
  return new Date().toISOString().slice(0, 10);
}

function fmtMoney(v) {
  return `R$ ${Number(v || 0).toFixed(2).replace(".", ",")}`;
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR");
}

function statusBadgeStyle(status) {
  const base = { fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 999 };
  if (status === "Lançada") return { ...base, background: "#dcfce7", color: "#16a34a" };
  if (status === "Cancelada") return { ...base, background: "#fee2e2", color: "#dc2626" };
  return { ...base, background: "#fef3c7", color: "#d97706" }; // Rascunho
}

function ComprasContent() {
  const [tab, setTab] = useState("notas"); // notas | fornecedores
  const [loading, setLoading] = useState(true);

  const [suppliers, setSuppliers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [products, setProducts] = useState([]);

  async function loadAll() {
    setLoading(true);
    const [s, i, p] = await Promise.all([
      supabase.from("suppliers").select("*").order("name"),
      supabase.from("purchase_invoices").select("*, suppliers(name)").order("created_at", { ascending: false }),
      supabase.from("products").select("id, name, sku, stock, cost_price").order("name"),
    ]);
    setSuppliers(s.data || []);
    setInvoices(i.data || []);
    setProducts(p.data || []);
    setLoading(false);
  }

  useEffect(() => { loadAll(); }, []);

  // ────────────────── FORNECEDORES ──────────────────
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [savingSupplier, setSavingSupplier] = useState(false);
  const [supName, setSupName] = useState("");
  const [supDocument, setSupDocument] = useState("");
  const [supPhone, setSupPhone] = useState("");
  const [supEmail, setSupEmail] = useState("");
  const [supAddress, setSupAddress] = useState("");

  function resetSupplierForm() {
    setSupName(""); setSupDocument(""); setSupPhone(""); setSupEmail(""); setSupAddress("");
  }

  async function handleCreateSupplier(e) {
    e.preventDefault();
    if (!supName.trim()) return;
    setSavingSupplier(true);
    await supabase.from("suppliers").insert({
      name: supName.trim(),
      document: supDocument.trim() || null,
      phone: supPhone.trim() || null,
      email: supEmail.trim() || null,
      address: supAddress.trim() || null,
    });
    resetSupplierForm();
    setShowSupplierForm(false);
    setSavingSupplier(false);
    loadAll();
  }

  async function handleToggleSupplierActive(id, active) {
    await supabase.from("suppliers").update({ active: !active, updated_at: new Date().toISOString() }).eq("id", id);
    loadAll();
  }

  // ────────────────── NOTAS DE COMPRA ──────────────────
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [savingInvoice, setSavingInvoice] = useState(false);
  const [launchingId, setLaunchingId] = useState(null);
  const [invSupplierId, setInvSupplierId] = useState("");
  const [invNumber, setInvNumber] = useState("");
  const [invDate, setInvDate] = useState(todayDateInput());
  const [invNotes, setInvNotes] = useState("");
  const [items, setItems] = useState([{ productId: "", quantity: "", unitCost: "", taxPct: "" }]);

  function resetInvoiceForm() {
    setInvSupplierId(""); setInvNumber(""); setInvDate(todayDateInput()); setInvNotes("");
    setItems([{ productId: "", quantity: "", unitCost: "", taxPct: "" }]);
  }

  function updateItem(index, field, value) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, [field]: value } : it)));
  }

  function addItemRow() {
    setItems((prev) => [...prev, { productId: "", quantity: "", unitCost: "", taxPct: "" }]);
  }

  function removeItemRow(index) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  const itemsTotal = useMemo(
    () => items.reduce((sum, it) => sum + (parseFloat(it.quantity) || 0) * (parseFloat(it.unitCost) || 0), 0),
    [items]
  );

  async function handleCreateInvoice(e) {
    e.preventDefault();
    const validItems = items.filter((it) => it.productId && it.quantity && it.unitCost);
    if (validItems.length === 0) return;

    setSavingInvoice(true);

    const { data: invoice, error: invoiceError } = await supabase
      .from("purchase_invoices")
      .insert({
        supplier_id: invSupplierId || null,
        invoice_number: invNumber.trim() || null,
        issue_date: invDate,
        notes: invNotes.trim() || null,
        status: "Rascunho",
      })
      .select()
      .single();

    if (!invoiceError && invoice) {
      const itemsPayload = validItems.map((it) => ({
        purchase_invoice_id: invoice.id,
        product_id: it.productId,
        quantity: parseInt(it.quantity, 10),
        unit_cost: parseFloat(it.unitCost),
        tax_pct: it.taxPct ? parseFloat(it.taxPct) : null,
      }));
      await supabase.from("purchase_invoice_items").insert(itemsPayload);
    }

    resetInvoiceForm();
    setShowInvoiceForm(false);
    setSavingInvoice(false);
    loadAll();
  }

  async function handleLaunchInvoice(id) {
    if (!confirm("Lançar essa nota vai atualizar estoque e custo dos produtos automaticamente. Essa ação não pode ser desfeita. Confirmar?")) return;
    setLaunchingId(id);
    const { error } = await supabase.rpc("launch_purchase_invoice", { invoice_id: id });
    if (error) alert(`Erro ao lançar: ${error.message}`);
    setLaunchingId(null);
    loadAll();
  }

  return (
    <div>
      <Sidebar />
      <div style={styles.content}>
        <h1 style={styles.title}>Compras e Suprimentos</h1>
        <p style={styles.subtitle}>Fornecedores e notas de compra — abastece estoque e custo automaticamente</p>

        <div style={styles.tabs}>
          <button onClick={() => setTab("notas")} style={{ ...styles.tabButton, ...(tab === "notas" ? styles.tabActive : {}) }}>Notas de Compra</button>
          <button onClick={() => setTab("fornecedores")} style={{ ...styles.tabButton, ...(tab === "fornecedores" ? styles.tabActive : {}) }}>Fornecedores</button>
        </div>

        {loading ? (
          <p style={styles.empty}>Carregando…</p>
        ) : tab === "fornecedores" ? (
          <>
            <button onClick={() => setShowSupplierForm((v) => !v)} style={styles.newButton}>
              <Plus size={16} /> Novo fornecedor
            </button>

            {showSupplierForm && (
              <form onSubmit={handleCreateSupplier} style={styles.form}>
                <label style={styles.label}>Nome *</label>
                <input value={supName} onChange={(e) => setSupName(e.target.value)} style={styles.input} required />
                <div style={styles.row}>
                  <div style={{ flex: 1 }}>
                    <label style={styles.label}>CNPJ/CPF</label>
                    <input value={supDocument} onChange={(e) => setSupDocument(e.target.value)} style={styles.input} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={styles.label}>Telefone</label>
                    <input value={supPhone} onChange={(e) => setSupPhone(e.target.value)} style={styles.input} />
                  </div>
                </div>
                <label style={styles.label}>E-mail</label>
                <input type="email" value={supEmail} onChange={(e) => setSupEmail(e.target.value)} style={styles.input} />
                <label style={styles.label}>Endereço</label>
                <input value={supAddress} onChange={(e) => setSupAddress(e.target.value)} style={styles.input} />
                <button type="submit" style={styles.saveButton} disabled={savingSupplier}>{savingSupplier ? "Salvando…" : "Cadastrar fornecedor"}</button>
              </form>
            )}

            {suppliers.length === 0 ? (
              <p style={styles.empty}>Nenhum fornecedor cadastrado ainda.</p>
            ) : (
              <div style={styles.tableWrap}>
                <table>
                  <thead>
                    <tr>
                      <th style={styles.th}>Nome</th>
                      <th style={styles.th}>CNPJ/CPF</th>
                      <th style={styles.th}>Telefone</th>
                      <th style={styles.th}>E-mail</th>
                      <th style={styles.th}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suppliers.map((s) => (
                      <tr key={s.id} style={{ ...styles.tr, ...(!s.active ? { opacity: 0.5 } : {}) }}>
                        <td style={styles.td}>{s.name}</td>
                        <td style={styles.td}>{s.document || "—"}</td>
                        <td style={styles.td}>{s.phone || "—"}</td>
                        <td style={styles.td}>{s.email || "—"}</td>
                        <td style={styles.td}>
                          <button onClick={() => handleToggleSupplierActive(s.id, s.active)} style={styles.smallButton}>
                            {s.active ? "Desativar" : "Reativar"}
                          </button>
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
            <p style={styles.explainer}>
              <Info size={13} style={{ flexShrink: 0, marginTop: 1 }} />
              Crie a nota como rascunho, adicione os produtos, e só clique em "Lançar" quando tiver certeza —
              lançar atualiza o estoque e o custo (média ponderada) de cada produto automaticamente e não pode ser desfeito.
            </p>

            <button onClick={() => setShowInvoiceForm((v) => !v)} style={styles.newButton}>
              <Plus size={16} /> Nova nota de compra
            </button>

            {showInvoiceForm && (
              <form onSubmit={handleCreateInvoice} style={{ ...styles.form, maxWidth: 720 }}>
                <div style={styles.row}>
                  <div style={{ flex: 1 }}>
                    <label style={styles.label}>Fornecedor</label>
                    <select value={invSupplierId} onChange={(e) => setInvSupplierId(e.target.value)} style={styles.input}>
                      <option value="">Selecione…</option>
                      {suppliers.filter((s) => s.active).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={styles.label}>Nº da nota</label>
                    <input value={invNumber} onChange={(e) => setInvNumber(e.target.value)} style={styles.input} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={styles.label}>Data de emissão</label>
                    <input type="date" value={invDate} onChange={(e) => setInvDate(e.target.value)} style={styles.input} />
                  </div>
                </div>

                <label style={{ ...styles.label, marginTop: 20 }}>Produtos da nota</label>
                {items.map((it, index) => (
                  <div key={index} style={styles.itemRow}>
                    <select
                      value={it.productId}
                      onChange={(e) => updateItem(index, "productId", e.target.value)}
                      style={{ ...styles.input, flex: 3 }}
                    >
                      <option value="">Selecione o produto…</option>
                      {products.map((p) => <option key={p.id} value={p.id}>{p.name} {p.sku ? `(${p.sku})` : ""}</option>)}
                    </select>
                    <input
                      type="number" min="1" placeholder="Qtd."
                      value={it.quantity} onChange={(e) => updateItem(index, "quantity", e.target.value)}
                      style={{ ...styles.input, flex: 1 }}
                    />
                    <input
                      type="number" step="0.01" min="0" placeholder="Custo unit. (R$)"
                      value={it.unitCost} onChange={(e) => updateItem(index, "unitCost", e.target.value)}
                      style={{ ...styles.input, flex: 1 }}
                    />
                    <input
                      type="number" step="0.1" min="0" placeholder="% Impostos"
                      value={it.taxPct} onChange={(e) => updateItem(index, "taxPct", e.target.value)}
                      style={{ ...styles.input, flex: 1 }}
                    />
                    <button type="button" onClick={() => removeItemRow(index)} style={styles.removeItemButton}>
                      <Trash2 size={14} color="#dc2626" />
                    </button>
                  </div>
                ))}
                <button type="button" onClick={addItemRow} style={styles.addItemButton}>
                  <Plus size={14} /> Adicionar produto
                </button>

                <label style={styles.label}>Observações</label>
                <textarea value={invNotes} onChange={(e) => setInvNotes(e.target.value)} style={{ ...styles.input, minHeight: 60 }} />

                <div style={styles.invoiceTotalBox}>
                  <span>Total da nota</span>
                  <strong>{fmtMoney(itemsTotal)}</strong>
                </div>

                <button type="submit" style={styles.saveButton} disabled={savingInvoice}>
                  {savingInvoice ? "Salvando…" : "Salvar como rascunho"}
                </button>
              </form>
            )}

            {invoices.length === 0 ? (
              <p style={styles.empty}>Nenhuma nota de compra cadastrada ainda.</p>
            ) : (
              <div style={styles.tableWrap}>
                <table>
                  <thead>
                    <tr>
                      <th style={styles.th}>Nº Nota</th>
                      <th style={styles.th}>Fornecedor</th>
                      <th style={styles.th}>Emissão</th>
                      <th style={styles.th}>Total</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr key={inv.id} style={styles.tr}>
                        <td style={styles.td}>{inv.invoice_number || "—"}</td>
                        <td style={styles.td}>{inv.suppliers?.name || "—"}</td>
                        <td style={styles.td}>{fmtDate(inv.issue_date)}</td>
                        <td style={styles.td}>{fmtMoney(inv.total_value)}</td>
                        <td style={styles.td}><span style={statusBadgeStyle(inv.status)}>{inv.status}</span></td>
                        <td style={styles.td}>
                          {inv.status === "Rascunho" && (
                            <button
                              onClick={() => handleLaunchInvoice(inv.id)}
                              disabled={launchingId === inv.id}
                              style={styles.launchButton}
                            >
                              <PackageCheck size={13} /> {launchingId === inv.id ? "Lançando…" : "Lançar"}
                            </button>
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
      </div>
    </div>
  );
}

export default function ComprasPage() {
  return (
    <AuthGate>
      <ComprasContent />
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
  explainer: { display: "flex", gap: 6, fontSize: 12, color: "#737373", background: "#fafafa", border: "1px solid #e5e5e5", borderRadius: 10, padding: "9px 12px", marginBottom: 18 },
  empty: { color: "#a3a3a3", fontSize: 13, padding: 24, textAlign: "center" },
  newButton: { display: "flex", alignItems: "center", gap: 6, background: "#171717", color: "#fff", padding: "10px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", marginBottom: 14 },
  form: { background: "#fff", border: "1px solid #e5e5e5", borderRadius: 14, padding: 16, marginBottom: 16, display: "flex", flexDirection: "column", maxWidth: 560 },
  row: { display: "flex", gap: 12 },
  label: { fontSize: 12, fontWeight: 600, color: "#525252", marginBottom: 4, marginTop: 12, display: "block" },
  input: { border: "1px solid #e5e5e5", borderRadius: 10, padding: "9px 12px", outline: "none", width: "100%", font: "inherit" },
  saveButton: { border: "none", background: "#171717", color: "#fff", borderRadius: 10, padding: "11px 18px", fontWeight: 600, fontSize: 13, cursor: "pointer", marginTop: 16 },
  tableWrap: { background: "#fff", border: "1px solid #e5e5e5", borderRadius: 14, overflow: "auto" },
  th: { textAlign: "left", fontSize: 11, color: "#a3a3a3", textTransform: "uppercase", padding: "12px 14px", borderBottom: "1px solid #f0f0f0" },
  tr: { borderBottom: "1px solid #f5f5f5" },
  td: { padding: "10px 14px", fontSize: 13, verticalAlign: "middle" },
  smallButton: { border: "1px solid #e5e5e5", background: "#fff", borderRadius: 8, padding: "6px 10px", fontSize: 11.5, fontWeight: 600, cursor: "pointer" },
  itemRow: { display: "flex", gap: 8, alignItems: "center", marginTop: 8 },
  removeItemButton: { width: 34, height: 34, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, border: "1px solid #e5e5e5", background: "#fff", cursor: "pointer" },
  addItemButton: { display: "flex", alignItems: "center", gap: 6, border: "1px dashed #d4d4d4", background: "#fafafa", borderRadius: 10, padding: "8px 12px", fontSize: 12.5, fontWeight: 600, color: "#525252", cursor: "pointer", marginTop: 10, alignSelf: "flex-start" },
  invoiceTotalBox: { display: "flex", justifyContent: "space-between", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "10px 14px", marginTop: 16, fontSize: 14, color: "#166534" },
  launchButton: { display: "flex", alignItems: "center", gap: 5, border: "none", background: "#16a34a", color: "#fff", borderRadius: 8, padding: "6px 10px", fontSize: 11.5, fontWeight: 600, cursor: "pointer" },
};

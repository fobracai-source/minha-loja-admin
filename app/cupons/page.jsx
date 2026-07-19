"use client";

import { useEffect, useState } from "react";
import AuthGate from "../../components/AuthGate";
import Sidebar from "../../components/Sidebar";
import { supabase } from "../../lib/supabaseClient";
import { Plus, Trash2, Tag } from "lucide-react";

function CuponsContent() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [minOrderValue, setMinOrderValue] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadCoupons() {
    setLoading(true);
    const { data } = await supabase.from("coupons").select("*").order("created_at", { ascending: false });
    setCoupons(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadCoupons();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    if (!code.trim() || !discountValue) return;
    setSaving(true);

    const { error: insertError } = await supabase.from("coupons").insert({
      code: code.trim().toUpperCase(),
      discount_type: discountType,
      discount_value: parseFloat(discountValue),
      min_order_value: minOrderValue ? parseFloat(minOrderValue) : 0,
      max_uses: maxUses ? parseInt(maxUses, 10) : null,
      valid_until: validUntil ? new Date(validUntil).toISOString() : null,
    });

    setSaving(false);

    if (insertError) {
      setError(insertError.message.includes("duplicate") ? "Já existe um cupom com esse código." : insertError.message);
      return;
    }

    setCode(""); setDiscountValue(""); setMinOrderValue(""); setMaxUses(""); setValidUntil("");
    setShowForm(false);
    loadCoupons();
  }

  async function handleToggleActive(id, active) {
    await supabase.from("coupons").update({ active: !active }).eq("id", id);
    loadCoupons();
  }

  async function handleDelete(id, couponCode) {
    if (!confirm(`Excluir o cupom "${couponCode}"?`)) return;
    await supabase.from("coupons").delete().eq("id", id);
    loadCoupons();
  }

  return (
    <div>
      <Sidebar />
      <div style={styles.content}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Cupons</h1>
            <p style={styles.subtitle}>{coupons.length} cadastrados</p>
          </div>
          <button onClick={() => setShowForm((v) => !v)} style={styles.newButton}>
            <Plus size={16} /> Novo cupom
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleCreate} style={styles.form}>
            <div style={styles.row}>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>Código *</label>
                <input
                  value={code} onChange={(e) => setCode(e.target.value)}
                  style={styles.input} placeholder="Ex: BEMVINDO10" required
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>Tipo de desconto</label>
                <select value={discountType} onChange={(e) => setDiscountType(e.target.value)} style={styles.input}>
                  <option value="percentage">Porcentagem (%)</option>
                  <option value="fixed">Valor fixo (R$)</option>
                </select>
              </div>
            </div>

            <div style={styles.row}>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>
                  Valor do desconto {discountType === "percentage" ? "(%)" : "(R$)"} *
                </label>
                <input
                  type="number" step="0.01" min="0"
                  value={discountValue} onChange={(e) => setDiscountValue(e.target.value)}
                  style={styles.input} required
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>Pedido mínimo (R$)</label>
                <input
                  type="number" step="0.01" min="0"
                  value={minOrderValue} onChange={(e) => setMinOrderValue(e.target.value)}
                  style={styles.input} placeholder="0,00"
                />
              </div>
            </div>

            <div style={styles.row}>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>Limite de usos</label>
                <input
                  type="number" min="1"
                  value={maxUses} onChange={(e) => setMaxUses(e.target.value)}
                  style={styles.input} placeholder="Deixe em branco para ilimitado"
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>Válido até</label>
                <input
                  type="date"
                  value={validUntil} onChange={(e) => setValidUntil(e.target.value)}
                  style={styles.input}
                />
              </div>
            </div>

            {error && <p style={styles.error}>{error}</p>}

            <button type="submit" style={styles.saveButton} disabled={saving}>
              {saving ? "Salvando…" : "Criar cupom"}
            </button>
          </form>
        )}

        {loading ? (
          <p style={styles.empty}>Carregando…</p>
        ) : coupons.length === 0 ? (
          <p style={styles.empty}>Nenhum cupom cadastrado ainda.</p>
        ) : (
          <div style={styles.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th style={styles.th}>Código</th>
                  <th style={styles.th}>Desconto</th>
                  <th style={styles.th}>Pedido mín.</th>
                  <th style={styles.th}>Usos</th>
                  <th style={styles.th}>Validade</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}></th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((c) => (
                  <tr key={c.id} style={styles.tr}>
                    <td style={styles.td}>
                      <span style={styles.codeTag}><Tag size={11} /> {c.code}</span>
                    </td>
                    <td style={styles.td}>
                      {c.discount_type === "percentage"
                        ? `${Number(c.discount_value)}%`
                        : `R$ ${Number(c.discount_value).toFixed(2).replace(".", ",")}`}
                    </td>
                    <td style={styles.td}>
                      {c.min_order_value > 0 ? `R$ ${Number(c.min_order_value).toFixed(2).replace(".", ",")}` : "—"}
                    </td>
                    <td style={styles.td}>{c.used_count}{c.max_uses ? ` / ${c.max_uses}` : ""}</td>
                    <td style={styles.td}>{c.valid_until ? new Date(c.valid_until).toLocaleDateString("pt-BR") : "Sem validade"}</td>
                    <td style={styles.td}>
                      <button
                        onClick={() => handleToggleActive(c.id, c.active)}
                        style={{ ...styles.badge, ...(c.active ? styles.badgeActive : styles.badgeInactive), border: "none", cursor: "pointer" }}
                      >
                        {c.active ? "Ativo" : "Inativo"}
                      </button>
                    </td>
                    <td style={styles.td}>
                      <button onClick={() => handleDelete(c.id, c.code)} style={styles.iconButton}>
                        <Trash2 size={14} color="#dc2626" />
                      </button>
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

export default function CuponsPage() {
  return (
    <AuthGate>
      <CuponsContent />
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
  form: {
    background: "#fff", border: "1px solid #e5e5e5", borderRadius: 14, padding: 16, marginBottom: 16,
    display: "flex", flexDirection: "column",
  },
  row: { display: "flex", gap: 12 },
  label: { fontSize: 12, fontWeight: 600, color: "#525252", marginBottom: 4, marginTop: 12, display: "block" },
  input: { border: "1px solid #e5e5e5", borderRadius: 10, padding: "9px 12px", outline: "none", width: "100%" },
  error: { color: "#dc2626", fontSize: 12, marginTop: 10 },
  saveButton: {
    border: "none", background: "#171717", color: "#fff", borderRadius: 10,
    padding: "11px 18px", fontWeight: 600, fontSize: 13, cursor: "pointer", marginTop: 16,
  },
  empty: { color: "#a3a3a3", fontSize: 13, padding: 24, textAlign: "center" },
  tableWrap: { background: "#fff", border: "1px solid #e5e5e5", borderRadius: 14, overflow: "auto" },
  th: { textAlign: "left", fontSize: 11, color: "#a3a3a3", textTransform: "uppercase", padding: "12px 14px", borderBottom: "1px solid #f0f0f0" },
  tr: { borderBottom: "1px solid #f5f5f5" },
  td: { padding: "10px 14px", fontSize: 13, verticalAlign: "middle" },
  codeTag: {
    display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 700,
    background: "#f5f5f5", borderRadius: 8, padding: "3px 8px", fontSize: 12,
  },
  badge: { fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 999 },
  badgeActive: { background: "#dcfce7", color: "#16a34a" },
  badgeInactive: { background: "#f0f0f0", color: "#a3a3a3" },
  iconButton: {
    width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
    borderRadius: 8, border: "1px solid #e5e5e5", background: "#fff", cursor: "pointer",
  },
};

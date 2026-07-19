"use client";

import { useEffect, useState } from "react";
import AuthGate from "../../components/AuthGate";
import Sidebar from "../../components/Sidebar";
import { supabase } from "../../lib/supabaseClient";
import { Truck, CheckCircle2, AlertTriangle, Package } from "lucide-react";

const DELIVERY_STATUSES = [
  { id: "aguardando_separacao", label: "Aguardando Separação" },
  { id: "em_separacao", label: "Em Separação" },
  { id: "saiu_para_entrega", label: "Saiu para Entrega" },
  { id: "entregue", label: "Entregue" },
  { id: "problema", label: "Problema na Entrega" },
];

function LogisticaContent() {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("todos");

  async function loadDeliveries() {
    setLoading(true);
    const { data } = await supabase
      .from("deliveries")
      .select("*, orders(order_number, total, created_at, customers(name, phone, address, reference_point))")
      .order("created_at", { ascending: false });
    setDeliveries(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadDeliveries();
  }, []);

  async function handleFieldChange(id, field, value) {
    setDeliveries((prev) => prev.map((d) => (d.id === id ? { ...d, [field]: value } : d)));
  }

  async function handleFieldSave(id, field, value) {
    await supabase.from("deliveries").update({ [field]: value, updated_at: new Date().toISOString() }).eq("id", id);
  }

  async function handleStatusChange(id, newStatus) {
    const payload = { status: newStatus, updated_at: new Date().toISOString() };
    if (newStatus === "entregue") payload.delivered_at = new Date().toISOString();
    await supabase.from("deliveries").update(payload).eq("id", id);
    loadDeliveries();
  }

  const counts = DELIVERY_STATUSES.reduce((acc, s) => {
    acc[s.id] = deliveries.filter((d) => d.status === s.id).length;
    return acc;
  }, {});

  const filtered = deliveries.filter((d) => statusFilter === "todos" || d.status === statusFilter);

  return (
    <div>
      <Sidebar />
      <div style={styles.content}>
        <h1 style={styles.title}>Logística</h1>
        <p style={styles.subtitle}>Acompanhamento de entrega de cada pedido</p>

        <div style={styles.statsRow}>
          {DELIVERY_STATUSES.map((s) => (
            <button
              key={s.id}
              onClick={() => setStatusFilter(statusFilter === s.id ? "todos" : s.id)}
              style={{
                ...styles.statCard,
                ...(statusFilter === s.id ? styles.statCardActive : {}),
                ...(s.id === "problema" && counts[s.id] > 0 ? styles.statCardAlert : {}),
              }}
            >
              <div style={styles.statValue}>{counts[s.id] || 0}</div>
              <div style={styles.statLabel}>{s.label}</div>
            </button>
          ))}
        </div>

        {loading ? (
          <p style={styles.empty}>Carregando…</p>
        ) : filtered.length === 0 ? (
          <p style={styles.empty}>Nenhuma entrega encontrada nesse filtro.</p>
        ) : (
          <div style={styles.list}>
            {filtered.map((d) => {
              const order = d.orders;
              const customer = order?.customers;
              return (
                <div key={d.id} style={styles.card}>
                  <div style={styles.cardHeader}>
                    <div>
                      <span style={styles.orderNumber}>Pedido #{order?.order_number}</span>
                      <span style={styles.customerName}> · {customer?.name || "—"}</span>
                    </div>
                    <select
                      value={d.status}
                      onChange={(e) => handleStatusChange(d.id, e.target.value)}
                      style={{
                        ...styles.statusSelect,
                        ...(d.status === "entregue" ? styles.statusDone : {}),
                        ...(d.status === "problema" ? styles.statusProblem : {}),
                      }}
                    >
                      {DELIVERY_STATUSES.map((s) => (
                        <option key={s.id} value={s.id}>{s.label}</option>
                      ))}
                    </select>
                  </div>

                  <p style={styles.address}>
                    {customer?.address || "Endereço não informado"}
                    {customer?.reference_point && ` — Ref: ${customer.reference_point}`}
                  </p>

                  <div style={styles.fieldsRow}>
                    <div style={{ flex: 1 }}>
                      <label style={styles.fieldLabel}>Transportadora / Entregador</label>
                      <input
                        value={d.carrier || ""}
                        onChange={(e) => handleFieldChange(d.id, "carrier", e.target.value)}
                        onBlur={(e) => handleFieldSave(d.id, "carrier", e.target.value)}
                        style={styles.input}
                        placeholder="Ex: Correios, Motoboy João"
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={styles.fieldLabel}>Código de rastreio</label>
                      <input
                        value={d.tracking_code || ""}
                        onChange={(e) => handleFieldChange(d.id, "tracking_code", e.target.value)}
                        onBlur={(e) => handleFieldSave(d.id, "tracking_code", e.target.value)}
                        style={styles.input}
                        placeholder="Opcional"
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={styles.fieldLabel}>Previsão de entrega</label>
                      <input
                        type="date"
                        value={d.estimated_date || ""}
                        onChange={(e) => handleFieldChange(d.id, "estimated_date", e.target.value)}
                        onBlur={(e) => handleFieldSave(d.id, "estimated_date", e.target.value)}
                        style={styles.input}
                      />
                    </div>
                  </div>

                  {d.status === "entregue" && d.delivered_at && (
                    <p style={styles.deliveredNote}>
                      <CheckCircle2 size={13} color="#16a34a" /> Entregue em {new Date(d.delivered_at).toLocaleDateString("pt-BR")}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function LogisticaPage() {
  return (
    <AuthGate>
      <LogisticaContent />
    </AuthGate>
  );
}

const styles = {
  content: { padding: "24px 20px", maxWidth: 1000, margin: "0 auto" },
  title: { fontSize: 22, fontWeight: 700 },
  subtitle: { fontSize: 13, color: "#737373", marginBottom: 20 },
  statsRow: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 20 },
  statCard: {
    background: "#fff", border: "1px solid #e5e5e5", borderRadius: 12, padding: 12,
    textAlign: "left", cursor: "pointer",
  },
  statCardActive: { borderColor: "#171717", background: "#fafafa" },
  statCardAlert: { borderColor: "#fecaca" },
  statValue: { fontSize: 18, fontWeight: 700 },
  statLabel: { fontSize: 11, color: "#737373" },
  empty: { color: "#a3a3a3", fontSize: 13, padding: 24, textAlign: "center" },
  list: { display: "flex", flexDirection: "column", gap: 10 },
  card: { background: "#fff", border: "1px solid #e5e5e5", borderRadius: 14, padding: 16 },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 6 },
  orderNumber: { fontSize: 14, fontWeight: 700, color: "#171717" },
  customerName: { fontSize: 13, color: "#737373" },
  statusSelect: { border: "1px solid #e5e5e5", borderRadius: 8, padding: "6px 10px", fontSize: 12, fontWeight: 600 },
  statusDone: { background: "#dcfce7", borderColor: "#bbf7d0", color: "#16a34a" },
  statusProblem: { background: "#fef2f2", borderColor: "#fecaca", color: "#dc2626" },
  address: { fontSize: 12, color: "#737373", marginBottom: 12 },
  fieldsRow: { display: "flex", gap: 10, flexWrap: "wrap" },
  fieldLabel: { fontSize: 11, fontWeight: 600, color: "#525252", marginBottom: 3, display: "block" },
  input: { border: "1px solid #e5e5e5", borderRadius: 8, padding: "7px 10px", fontSize: 12, width: "100%" },
  deliveredNote: { display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#16a34a", marginTop: 10 },
};

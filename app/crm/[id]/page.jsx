"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AuthGate from "../../../components/AuthGate";
import Sidebar from "../../../components/Sidebar";
import { supabase } from "../../../lib/supabaseClient";
import { Phone, Mail, ArrowLeft, Trash2 } from "lucide-react";

const STAGES = [
  { id: "lead", label: "Lead" },
  { id: "contato_feito", label: "Contato Feito" },
  { id: "negociacao", label: "Negociação" },
  { id: "cliente", label: "Cliente" },
];

const INTERACTION_TYPES = [
  { id: "ligacao", label: "Ligação" },
  { id: "email", label: "E-mail" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "reuniao", label: "Reunião" },
  { id: "outro", label: "Outro" },
];

function CustomerDetailContent() {
  const { id } = useParams();
  const router = useRouter();
  const [customer, setCustomer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [interactions, setInteractions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [newType, setNewType] = useState("ligacao");
  const [newDescription, setNewDescription] = useState("");

  async function loadAll() {
    setLoading(true);
    const [{ data: customerData }, { data: orderData }, { data: interactionData }] = await Promise.all([
      supabase.from("customers").select("*").eq("id", id).single(),
      supabase.from("orders").select("*").eq("customer_id", id).order("created_at", { ascending: false }),
      supabase.from("interactions").select("*").eq("customer_id", id).order("created_at", { ascending: false }),
    ]);
    setCustomer(customerData);
    setOrders(orderData || []);
    setInteractions(interactionData || []);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleStageChange(stage) {
    await supabase.from("customers").update({ stage }).eq("id", id);
    setCustomer((c) => ({ ...c, stage }));
  }

  async function handleAddInteraction(e) {
    e.preventDefault();
    if (!newDescription.trim()) return;
    await supabase.from("interactions").insert({
      customer_id: id,
      type: newType,
      description: newDescription,
    });
    setNewDescription("");
    loadAll();
  }

  async function handleDeleteInteraction(interactionId) {
    await supabase.from("interactions").delete().eq("id", interactionId);
    loadAll();
  }

  if (loading) {
    return (
      <div>
        <Sidebar />
        <div style={styles.content}><p style={{ color: "#a3a3a3" }}>Carregando…</p></div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div>
        <Sidebar />
        <div style={styles.content}><p style={{ color: "#a3a3a3" }}>Cliente não encontrado.</p></div>
      </div>
    );
  }

  const totalGasto = orders.reduce((sum, o) => sum + Number(o.total), 0);

  return (
    <div>
      <Sidebar />
      <div style={styles.content}>
        <button onClick={() => router.push("/crm")} style={styles.backButton}>
          <ArrowLeft size={14} /> Voltar ao CRM
        </button>

        <div style={styles.headerCard}>
          <div>
            <h1 style={styles.title}>{customer.name}</h1>
            <div style={styles.contactRow}>
              {customer.email && <span style={styles.contactItem}><Mail size={13} /> {customer.email}</span>}
              {customer.phone && <span style={styles.contactItem}><Phone size={13} /> {customer.phone}</span>}
            </div>
            {customer.address && (
              <p style={styles.addressText}>
                {customer.address}
                {customer.reference_point && ` — Referência: ${customer.reference_point}`}
              </p>
            )}
          </div>
          <select
            value={customer.stage}
            onChange={(e) => handleStageChange(e.target.value)}
            style={styles.stageSelect}
          >
            {STAGES.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>

        <div style={styles.statsRow}>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{orders.length}</div>
            <div style={styles.statLabel}>Pedidos realizados</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>R$ {totalGasto.toFixed(2).replace(".", ",")}</div>
            <div style={styles.statLabel}>Total gasto</div>
          </div>
        </div>

        <div style={styles.grid}>
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Histórico de compras</h2>
            {orders.length === 0 ? (
              <p style={styles.empty}>Nenhum pedido ainda.</p>
            ) : (
              orders.map((o) => (
                <div key={o.id} style={styles.orderRow}>
                  <span>#{o.order_number}</span>
                  <span>{new Date(o.created_at).toLocaleDateString("pt-BR")}</span>
                  <span>{o.status}</span>
                  <span style={{ fontWeight: 700 }}>R$ {Number(o.total).toFixed(2).replace(".", ",")}</span>
                </div>
              ))
            )}
          </div>

          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Interações</h2>

            <form onSubmit={handleAddInteraction} style={styles.interactionForm}>
              <select value={newType} onChange={(e) => setNewType(e.target.value)} style={styles.typeSelect}>
                {INTERACTION_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
              <input
                placeholder="O que foi conversado?"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                style={styles.interactionInput}
              />
              <button type="submit" style={styles.addButton}>Registrar</button>
            </form>

            {interactions.length === 0 ? (
              <p style={styles.empty}>Nenhuma interação registrada ainda.</p>
            ) : (
              <div style={styles.timeline}>
                {interactions.map((i) => (
                  <div key={i.id} style={styles.timelineItem}>
                    <div style={styles.timelineHeader}>
                      <span style={styles.timelineType}>{INTERACTION_TYPES.find((t) => t.id === i.type)?.label || i.type}</span>
                      <span style={styles.timelineDate}>{new Date(i.created_at).toLocaleString("pt-BR")}</span>
                      <button onClick={() => handleDeleteInteraction(i.id)} style={styles.deleteButton}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <p style={styles.timelineDescription}>{i.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CustomerDetailPage() {
  return (
    <AuthGate>
      <CustomerDetailContent />
    </AuthGate>
  );
}

const styles = {
  content: { padding: "24px 20px", maxWidth: 1000, margin: "0 auto" },
  backButton: {
    display: "flex", alignItems: "center", gap: 6, background: "none", border: "none",
    color: "#737373", fontSize: 13, cursor: "pointer", marginBottom: 12, padding: 0,
  },
  headerCard: {
    display: "flex", justifyContent: "space-between", alignItems: "flex-start",
    flexWrap: "wrap", gap: 12, marginBottom: 16,
  },
  title: { fontSize: 22, fontWeight: 700 },
  contactRow: { display: "flex", gap: 14, marginTop: 4, flexWrap: "wrap" },
  contactItem: { display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#737373" },
  addressText: { fontSize: 12, color: "#737373", marginTop: 6 },
  stageSelect: { border: "1px solid #e5e5e5", borderRadius: 10, padding: "8px 12px", fontSize: 13, fontWeight: 600 },
  statsRow: { display: "flex", gap: 12, marginBottom: 20 },
  statCard: { background: "#fff", border: "1px solid #e5e5e5", borderRadius: 12, padding: "12px 18px", flex: 1 },
  statValue: { fontSize: 18, fontWeight: 700 },
  statLabel: { fontSize: 11, color: "#737373" },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  section: { background: "#fff", border: "1px solid #e5e5e5", borderRadius: 14, padding: 16 },
  sectionTitle: { fontSize: 14, fontWeight: 700, marginBottom: 10 },
  empty: { fontSize: 12, color: "#a3a3a3" },
  orderRow: {
    display: "flex", justifyContent: "space-between", fontSize: 12,
    padding: "8px 0", borderBottom: "1px solid #f5f5f5",
  },
  interactionForm: { display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 },
  typeSelect: { border: "1px solid #e5e5e5", borderRadius: 8, padding: "7px 10px", fontSize: 12 },
  interactionInput: { border: "1px solid #e5e5e5", borderRadius: 8, padding: "7px 10px", fontSize: 12 },
  addButton: {
    border: "none", background: "#171717", color: "#fff", borderRadius: 8,
    padding: "8px", fontWeight: 600, fontSize: 12, cursor: "pointer",
  },
  timeline: { display: "flex", flexDirection: "column", gap: 10 },
  timelineItem: { borderLeft: "2px solid #e5e5e5", paddingLeft: 10 },
  timelineHeader: { display: "flex", alignItems: "center", gap: 8 },
  timelineType: { fontSize: 11, fontWeight: 700, color: "#171717" },
  timelineDate: { fontSize: 10, color: "#a3a3a3", marginLeft: "auto" },
  deleteButton: { background: "none", border: "none", color: "#dc2626", cursor: "pointer", padding: 2 },
  timelineDescription: { fontSize: 12, color: "#525252", marginTop: 2 },
};

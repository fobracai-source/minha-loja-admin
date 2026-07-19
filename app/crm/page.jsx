"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AuthGate from "../../components/AuthGate";
import Sidebar from "../../components/Sidebar";
import { supabase } from "../../lib/supabaseClient";
import { Plus, Search } from "lucide-react";

const STAGES = [
  { id: "lead", label: "Lead" },
  { id: "contato_feito", label: "Contato Feito" },
  { id: "negociacao", label: "Negociação" },
  { id: "cliente", label: "Cliente" },
];

function CrmContent() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newSource, setNewSource] = useState("");

  async function loadCustomers() {
    setLoading(true);
    const { data } = await supabase
      .from("customers")
      .select("*")
      .order("created_at", { ascending: false });
    setCustomers(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadCustomers();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    await supabase.from("customers").insert({
      name: newName,
      email: newEmail || null,
      phone: newPhone || null,
      source: newSource || null,
      stage: "lead",
    });
    setNewName("");
    setNewEmail("");
    setNewPhone("");
    setNewSource("");
    setShowNewForm(false);
    loadCustomers();
  }

  const filtered = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <Sidebar />
      <div style={styles.content}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>CRM</h1>
            <p style={styles.subtitle}>{customers.length} pessoas cadastradas</p>
          </div>
          <button onClick={() => setShowNewForm((v) => !v)} style={styles.newButton}>
            <Plus size={16} /> Novo lead/cliente
          </button>
        </div>

        {showNewForm && (
          <form onSubmit={handleCreate} style={styles.newForm}>
            <input
              placeholder="Nome *"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              style={styles.input}
              required
            />
            <input
              placeholder="E-mail"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              style={styles.input}
            />
            <input
              placeholder="Telefone"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              style={styles.input}
            />
            <input
              placeholder="Origem (ex: Instagram, indicação)"
              value={newSource}
              onChange={(e) => setNewSource(e.target.value)}
              style={styles.input}
            />
            <button type="submit" style={styles.saveButton}>Salvar</button>
          </form>
        )}

        <div style={styles.searchBox}>
          <Search size={16} color="#a3a3a3" />
          <input
            placeholder="Buscar por nome…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        {loading ? (
          <p style={styles.empty}>Carregando…</p>
        ) : (
          <div style={styles.board}>
            {STAGES.map((stage) => {
              const stageCustomers = filtered.filter((c) => c.stage === stage.id);
              return (
                <div key={stage.id} style={styles.column}>
                  <div style={styles.columnHeader}>
                    <span>{stage.label}</span>
                    <span style={styles.columnCount}>{stageCustomers.length}</span>
                  </div>
                  <div style={styles.columnList}>
                    {stageCustomers.length === 0 && (
                      <p style={styles.columnEmpty}>Ninguém aqui ainda</p>
                    )}
                    {stageCustomers.map((c) => (
                      <Link key={c.id} href={`/crm/${c.id}`} style={styles.customerCard}>
                        <span style={styles.customerName}>{c.name}</span>
                        {c.source && <span style={styles.customerSource}>{c.source}</span>}
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CrmPage() {
  return (
    <AuthGate>
      <CrmContent />
    </AuthGate>
  );
}

const styles = {
  content: { padding: "24px 20px", maxWidth: 1100, margin: "0 auto" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 16 },
  title: { fontSize: 22, fontWeight: 700 },
  subtitle: { fontSize: 13, color: "#737373" },
  newButton: {
    display: "flex", alignItems: "center", gap: 6,
    background: "#171717", color: "#fff", padding: "10px 16px",
    borderRadius: 10, fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer",
  },
  newForm: {
    display: "flex", gap: 8, flexWrap: "wrap", background: "#fff",
    border: "1px solid #e5e5e5", borderRadius: 12, padding: 14, marginBottom: 16,
  },
  input: { border: "1px solid #e5e5e5", borderRadius: 10, padding: "9px 12px", outline: "none", flex: "1 1 160px" },
  saveButton: {
    border: "none", background: "#171717", color: "#fff", borderRadius: 10,
    padding: "9px 18px", fontWeight: 600, fontSize: 13, cursor: "pointer",
  },
  searchBox: {
    display: "flex", alignItems: "center", gap: 8,
    border: "1px solid #e5e5e5", borderRadius: 10, padding: "8px 12px",
    marginBottom: 16, maxWidth: 320, background: "#fff",
  },
  searchInput: { border: "none", outline: "none", flex: 1 },
  empty: { color: "#a3a3a3", fontSize: 13, padding: 24, textAlign: "center" },
  board: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 12,
  },
  column: { background: "#f5f5f5", borderRadius: 14, padding: 10, minHeight: 120 },
  columnHeader: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    fontSize: 12, fontWeight: 700, color: "#525252", padding: "4px 6px 10px",
  },
  columnCount: {
    background: "#e5e5e5", color: "#525252", fontSize: 11, fontWeight: 700,
    borderRadius: 999, padding: "1px 7px",
  },
  columnList: { display: "flex", flexDirection: "column", gap: 6 },
  columnEmpty: { fontSize: 12, color: "#a3a3a3", padding: "6px" },
  customerCard: {
    display: "flex", flexDirection: "column", gap: 2,
    background: "#fff", borderRadius: 10, padding: "10px 12px",
    border: "1px solid #e5e5e5",
  },
  customerName: { fontSize: 13, fontWeight: 600, color: "#171717" },
  customerSource: { fontSize: 11, color: "#a3a3a3" },
};

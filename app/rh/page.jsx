"use client";

import { useEffect, useMemo, useState } from "react";
import AuthGate from "../../components/AuthGate";
import Sidebar from "../../components/Sidebar";
import { supabase } from "../../lib/supabaseClient";
import { Plus, Trash2, Mail, Phone, Info } from "lucide-react";

const DEPARTMENTS = [
  "Presidência",
  "Financeiro",
  "Marketing e Vendas",
  "Compras e Suprimentos",
  "Logística e Distribuição",
  "Atendimento ao Cliente (SAC)",
  "Tecnologia (TI)",
  "Jurídico e Fiscal",
  "Recursos Humanos (RH)",
];

function fmtMoney(v) {
  return `R$ ${Number(v || 0).toFixed(2).replace(".", ",")}`;
}

function todayMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  return { start, end };
}

function RhContent() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [departmentFilter, setDepartmentFilter] = useState("todos");
  const [showForm, setShowForm] = useState(false);
  const [faturamentoMesAtual, setFaturamentoMesAtual] = useState(0);

  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [admissionDate, setAdmissionDate] = useState("");
  const [saving, setSaving] = useState(false);

  const [salarioTipo, setSalarioTipo] = useState("fixo");
  const [valorSalario, setValorSalario] = useState("");
  const [pctSalarioFaturamento, setPctSalarioFaturamento] = useState("");
  const [acrescimos, setAcrescimos] = useState("0");
  const [pctIr, setPctIr] = useState("0");

  async function loadEmployees() {
    setLoading(true);
    const { data } = await supabase.from("employees").select("*").order("name");
    setEmployees(data || []);
    setLoading(false);
  }

  async function loadFaturamentoMes() {
    const { start, end } = todayMonthRange();
    const { data } = await supabase
      .from("financial_transactions")
      .select("amount")
      .eq("type", "entrada")
      .eq("category", "RECEITA DE VENDA")
      .gte("due_date", start)
      .lte("due_date", end);
    setFaturamentoMesAtual((data || []).reduce((s, t) => s + Number(t.amount), 0));
  }

  useEffect(() => {
    loadEmployees();
    loadFaturamentoMes();
  }, []);

  function resetSalaryFields() {
    setSalarioTipo("fixo"); setValorSalario(""); setPctSalarioFaturamento(""); setAcrescimos("0"); setPctIr("0");
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);

    await supabase.from("employees").insert({
      name: name.trim(),
      role: role.trim() || null,
      department,
      email: email.trim() || null,
      phone: phone.trim() || null,
      admission_date: admissionDate || null,
      status: "ativo",
      salario_tipo: salarioTipo,
      valor_salario: salarioTipo === "fixo" ? parseFloat(valorSalario) || 0 : 0,
      pct_salario_faturamento: salarioTipo === "faturamento" ? parseFloat(pctSalarioFaturamento) || 0 : 0,
      acrescimos: parseFloat(acrescimos) || 0,
      pct_ir: parseFloat(pctIr) || 0,
    });

    setName(""); setRole(""); setEmail(""); setPhone(""); setAdmissionDate("");
    resetSalaryFields();
    setShowForm(false);
    setSaving(false);
    loadEmployees();
  }

  async function handleToggleStatus(id, status) {
    await supabase.from("employees").update({ status: status === "ativo" ? "inativo" : "ativo" }).eq("id", id);
    loadEmployees();
  }

  async function handleDelete(id, empName) {
    if (!confirm(`Remover "${empName}" da equipe?`)) return;
    await supabase.from("employees").delete().eq("id", id);
    loadEmployees();
  }

  const previewSalarioLiquido = useMemo(() => {
    let bruto;
    if (salarioTipo === "fixo") {
      bruto = (parseFloat(valorSalario) || 0) + (parseFloat(acrescimos) || 0);
    } else {
      bruto = (faturamentoMesAtual * (parseFloat(pctSalarioFaturamento) || 0)) / 100 + (parseFloat(acrescimos) || 0);
    }
    const ir = bruto * (parseFloat(pctIr) || 0) / 100;
    return { bruto, ir, liquido: bruto - ir };
  }, [salarioTipo, valorSalario, pctSalarioFaturamento, acrescimos, pctIr, faturamentoMesAtual]);

  function calcularLiquidoFuncionario(emp) {
    let bruto;
    if (emp.salario_tipo === "faturamento") {
      bruto = (faturamentoMesAtual * (emp.pct_salario_faturamento || 0)) / 100 + (emp.acrescimos || 0);
    } else {
      bruto = (emp.valor_salario || 0) + (emp.acrescimos || 0);
    }
    const ir = bruto * (emp.pct_ir || 0) / 100;
    return bruto - ir;
  }

  const counts = DEPARTMENTS.reduce((acc, d) => {
    acc[d] = employees.filter((e) => e.department === d && e.status === "ativo").length;
    return acc;
  }, {});

  const filtered = employees.filter((e) => departmentFilter === "todos" || e.department === departmentFilter);

  return (
    <div>
      <Sidebar />
      <div style={styles.content}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Recursos Humanos</h1>
            <p style={styles.subtitle}>{employees.filter((e) => e.status === "ativo").length} pessoas ativas na equipe</p>
          </div>
          <button onClick={() => setShowForm((v) => !v)} style={styles.newButton}>
            <Plus size={16} /> Cadastrar pessoa
          </button>
        </div>

        <div style={styles.deptGrid}>
          {DEPARTMENTS.map((d) => (
            <button
              key={d}
              onClick={() => setDepartmentFilter(departmentFilter === d ? "todos" : d)}
              style={{ ...styles.deptCard, ...(departmentFilter === d ? styles.deptCardActive : {}) }}
            >
              <div style={styles.deptCount}>{counts[d] || 0}</div>
              <div style={styles.deptLabel}>{d}</div>
            </button>
          ))}
        </div>

        {showForm && (
          <form onSubmit={handleCreate} style={styles.form}>
            <div style={styles.row}>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>Nome *</label>
                <input value={name} onChange={(e) => setName(e.target.value)} style={styles.input} required />
              </div>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>Cargo</label>
                <input value={role} onChange={(e) => setRole(e.target.value)} style={styles.input} placeholder="Ex: Vendedor" />
              </div>
            </div>
            <label style={styles.label}>Departamento</label>
            <select value={department} onChange={(e) => setDepartment(e.target.value)} style={styles.input}>
              {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <div style={styles.row}>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>E-mail</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={styles.input} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>Telefone</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} style={styles.input} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>Data de entrada</label>
                <input type="date" value={admissionDate} onChange={(e) => setAdmissionDate(e.target.value)} style={styles.input} />
              </div>
            </div>

            <h2 style={styles.sectionTitle}>Remuneração</h2>
            <p style={styles.explainer}>
              <Info size={13} style={{ flexShrink: 0, marginTop: 1 }} />
              Escolha como calcular o salário: um valor fixo, ou uma porcentagem sobre o faturamento
              de vendas do mês.
            </p>

            <div style={styles.toggleRow}>
              <button type="button" onClick={() => setSalarioTipo("fixo")} style={{ ...styles.toggleButton, ...(salarioTipo === "fixo" ? styles.toggleButtonActive : {}) }}>
                Salário fixo
              </button>
              <button type="button" onClick={() => setSalarioTipo("faturamento")} style={{ ...styles.toggleButton, ...(salarioTipo === "faturamento" ? styles.toggleButtonActive : {}) }}>
                % do faturamento
              </button>
            </div>

            {salarioTipo === "fixo" ? (
              <>
                <label style={styles.label}>Valor do salário (R$) *</label>
                <input type="number" step="0.01" min="0" value={valorSalario} onChange={(e) => setValorSalario(e.target.value)} style={styles.input} required />
              </>
            ) : (
              <>
                <label style={styles.label}>% Salário sobre faturamento *</label>
                <input type="number" step="0.01" min="0" max="100" value={pctSalarioFaturamento} onChange={(e) => setPctSalarioFaturamento(e.target.value)} style={styles.input} required />
                <span style={styles.fieldHint}>Faturamento de vendas deste mês até agora: {fmtMoney(faturamentoMesAtual)}</span>
              </>
            )}

            <div style={styles.row}>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>Acréscimos (R$)</label>
                <input type="number" step="0.01" min="0" value={acrescimos} onChange={(e) => setAcrescimos(e.target.value)} style={styles.input} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>% IR</label>
                <input type="number" step="0.01" min="0" max="100" value={pctIr} onChange={(e) => setPctIr(e.target.value)} style={styles.input} />
              </div>
            </div>

            <div style={styles.previewBox}>
              <div style={styles.previewRow}><span>Bruto</span><span>{fmtMoney(previewSalarioLiquido.bruto)}</span></div>
              <div style={styles.previewRow}><span>(-) IR</span><span>{fmtMoney(previewSalarioLiquido.ir)}</span></div>
              <div style={{ ...styles.previewRow, ...styles.previewRowFinal }}><span>Salário a receber</span><span>{fmtMoney(previewSalarioLiquido.liquido)}</span></div>
            </div>

            <button type="submit" style={styles.saveButton} disabled={saving}>
              {saving ? "Salvando…" : "Cadastrar"}
            </button>
          </form>
        )}

        {loading ? (
          <p style={styles.empty}>Carregando…</p>
        ) : filtered.length === 0 ? (
          <p style={styles.empty}>Ninguém cadastrado nesse filtro ainda.</p>
        ) : (
          <div style={styles.list}>
            {filtered.map((emp) => (
              <div key={emp.id} style={{ ...styles.card, ...(emp.status === "inativo" ? styles.cardInactive : {}) }}>
                <div style={styles.avatar}>{emp.name.charAt(0).toUpperCase()}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={styles.cardTop}>
                    <span style={styles.empName}>{emp.name}</span>
                    {emp.status === "inativo" && <span style={styles.inactiveBadge}>Inativo</span>}
                  </div>
                  <div style={styles.empRole}>{emp.role || "Sem cargo definido"} · {emp.department}</div>
                  <div style={styles.contactRow}>
                    {emp.email && <span style={styles.contactItem}><Mail size={11} /> {emp.email}</span>}
                    {emp.phone && <span style={styles.contactItem}><Phone size={11} /> {emp.phone}</span>}
                  </div>
                  <div style={styles.salaryRow}>
                    <span style={styles.salaryTag}>
                      {emp.salario_tipo === "faturamento" ? `${emp.pct_salario_faturamento}% do faturamento` : fmtMoney(emp.valor_salario)}
                    </span>
                    <span style={styles.salaryLiquido}>Líquido estimado este mês: {fmtMoney(calcularLiquidoFuncionario(emp))}</span>
                  </div>
                </div>
                <div style={styles.actions}>
                  <button onClick={() => handleToggleStatus(emp.id, emp.status)} style={styles.toggleButtonSmall}>
                    {emp.status === "ativo" ? "Desativar" : "Reativar"}
                  </button>
                  <button onClick={() => handleDelete(emp.id, emp.name)} style={styles.iconButton}>
                    <Trash2 size={14} color="#dc2626" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function RhPage() {
  return (
    <AuthGate>
      <RhContent />
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
  deptGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8, marginBottom: 18 },
  deptCard: {
    background: "#fff", border: "1px solid #e5e5e5", borderRadius: 12, padding: "10px 12px",
    textAlign: "left", cursor: "pointer",
  },
  deptCardActive: { borderColor: "#171717", background: "#fafafa" },
  deptCount: { fontSize: 16, fontWeight: 700 },
  deptLabel: { fontSize: 10.5, color: "#737373", lineHeight: 1.3 },
  form: {
    background: "#fff", border: "1px solid #e5e5e5", borderRadius: 14, padding: 16, marginBottom: 16,
    display: "flex", flexDirection: "column", maxWidth: 560,
  },
  row: { display: "flex", gap: 12 },
  label: { fontSize: 12, fontWeight: 600, color: "#525252", marginBottom: 4, marginTop: 12, display: "block" },
  input: { border: "1px solid #e5e5e5", borderRadius: 10, padding: "9px 12px", outline: "none", width: "100%", font: "inherit" },
  fieldHint: { fontSize: 10.5, color: "#a3a3a3", marginTop: 4, display: "block" },
  saveButton: {
    border: "none", background: "#171717", color: "#fff", borderRadius: 10,
    padding: "11px 18px", fontWeight: 600, fontSize: 13, cursor: "pointer", marginTop: 16,
  },
  sectionTitle: { fontSize: 13, fontWeight: 700, color: "#171717", textTransform: "uppercase", letterSpacing: 0.3, marginTop: 20, marginBottom: 4, paddingBottom: 6, borderBottom: "1px solid #f0f0f0" },
  explainer: { display: "flex", gap: 6, fontSize: 11.5, color: "#737373", background: "#fafafa", border: "1px solid #e5e5e5", borderRadius: 10, padding: "8px 10px", marginTop: 8 },
  toggleRow: { display: "flex", gap: 8, marginTop: 12 },
  toggleButton: { flex: 1, border: "1px solid #e5e5e5", background: "#fff", borderRadius: 10, padding: "9px 12px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", color: "#737373" },
  toggleButtonActive: { background: "#171717", color: "#fff", borderColor: "#171717" },
  previewBox: { background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: "12px 16px", marginTop: 16, display: "flex", flexDirection: "column", gap: 4 },
  previewRow: { display: "flex", justifyContent: "space-between", fontSize: 12.5, color: "#166534" },
  previewRowFinal: { borderTop: "1px solid #bbf7d0", marginTop: 4, paddingTop: 6, fontWeight: 800, fontSize: 14, color: "#14532d" },
  empty: { color: "#a3a3a3", fontSize: 13, padding: 24, textAlign: "center" },
  list: { display: "flex", flexDirection: "column", gap: 8 },
  card: {
    display: "flex", alignItems: "center", gap: 12,
    background: "#fff", border: "1px solid #e5e5e5", borderRadius: 12, padding: 12,
  },
  cardInactive: { opacity: 0.55 },
  avatar: {
    width: 38, height: 38, borderRadius: 19, background: "#171717", color: "#fff",
    display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 15, flexShrink: 0,
  },
  cardTop: { display: "flex", alignItems: "center", gap: 8 },
  empName: { fontSize: 13, fontWeight: 700, color: "#171717" },
  inactiveBadge: { fontSize: 10, fontWeight: 600, color: "#a3a3a3", background: "#f0f0f0", borderRadius: 999, padding: "2px 7px" },
  empRole: { fontSize: 12, color: "#737373", marginTop: 1 },
  contactRow: { display: "flex", gap: 12, marginTop: 4, flexWrap: "wrap" },
  contactItem: { display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#a3a3a3" },
  salaryRow: { display: "flex", gap: 10, marginTop: 6, flexWrap: "wrap", alignItems: "center" },
  salaryTag: { fontSize: 11, fontWeight: 700, background: "#eff6ff", color: "#2563eb", borderRadius: 999, padding: "3px 9px" },
  salaryLiquido: { fontSize: 11, color: "#16a34a", fontWeight: 600 },
  actions: { display: "flex", gap: 6, flexShrink: 0 },
  toggleButtonSmall: {
    border: "1px solid #e5e5e5", background: "#fff", borderRadius: 8,
    padding: "6px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer",
  },
  iconButton: {
    width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
    borderRadius: 8, border: "1px solid #e5e5e5", background: "#fff", cursor: "pointer",
  },
};

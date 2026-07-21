"use client";

import { useEffect, useMemo, useState } from "react";
import AuthGate from "../../components/AuthGate";
import Sidebar from "../../components/Sidebar";
import { supabase } from "../../lib/supabaseClient";
import {
  FileText, Landmark, ShieldCheck, MessageSquareWarning, BadgeCheck, Plus,
} from "lucide-react";

function todayDateInput() {
  return new Date().toISOString().slice(0, 10);
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR");
}

function fmtMoney(v) {
  if (v === null || v === undefined) return "—";
  return `R$ ${Number(v).toFixed(2).replace(".", ",")}`;
}

function daysUntil(d) {
  if (!d) return null;
  return Math.ceil((new Date(d + "T00:00:00") - new Date(todayDateInput() + "T00:00:00")) / 86400000);
}

// Opções de status por área — usadas no formulário e no seletor rápido da lista
const STATUS_OPTIONS = {
  contratos: ["Vigente", "Encerrado", "Renovação Pendente", "Cancelado"],
  fiscal: ["Pendente", "Pago", "Atrasado"],
  lgpd: ["Recebida", "Em Andamento", "Concluída", "Negada"],
  reclamacoes: ["Aberta", "Em Análise", "Respondida", "Resolvida", "Escalada"],
};

function statusBadgeStyle(status) {
  const positive = ["Vigente", "Pago", "Concluída", "Resolvida"];
  const negative = ["Cancelado", "Atrasado", "Negada", "Escalada"];
  const base = { fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 999, border: "none", cursor: "pointer" };
  if (positive.includes(status)) return { ...base, background: "#dcfce7", color: "#16a34a" };
  if (negative.includes(status)) return { ...base, background: "#fee2e2", color: "#dc2626" };
  return { ...base, background: "#f0f0f0", color: "#737373" };
}

function JuridicoContent() {
  const [tab, setTab] = useState("contratos");
  const [loading, setLoading] = useState(true);

  const [contratos, setContratos] = useState([]);
  const [obrigacoes, setObrigacoes] = useState([]);
  const [lgpd, setLgpd] = useState([]);
  const [reclamacoes, setReclamacoes] = useState([]);
  const [documentos, setDocumentos] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [ticketsSac, setTicketsSac] = useState([]);

  async function loadAll() {
    setLoading(true);
    const [c, o, l, r, d, e, s] = await Promise.all([
      supabase.from("juridico_contratos").select("*").order("data_fim", { ascending: true, nullsFirst: false }),
      supabase.from("juridico_obrigacoes_fiscais").select("*").order("vencimento", { ascending: true }),
      supabase.from("juridico_lgpd_solicitacoes").select("*").order("prazo_resposta", { ascending: true }),
      supabase.from("juridico_reclamacoes").select("*").order("data_reclamacao", { ascending: false }),
      supabase.from("juridico_documentos").select("*").order("data_validade", { ascending: true, nullsFirst: false }),
      supabase.from("employees").select("id, name, department"),
      supabase.from("support_tickets").select("id, subject, customer_name, status").order("created_at", { ascending: false }),
    ]);
    setContratos(c.data || []);
    setObrigacoes(o.data || []);
    setLgpd(l.data || []);
    setReclamacoes(r.data || []);
    setDocumentos(d.data || []);
    setEmployees(e.data || []);
    setTicketsSac(s.data || []);
    setLoading(false);
  }

  useEffect(() => { loadAll(); }, []);

  const employeeMap = useMemo(() => {
    const map = {};
    employees.forEach((e) => { map[e.id] = e.name; });
    return map;
  }, [employees]);

  const ticketMap = useMemo(() => {
    const map = {};
    ticketsSac.forEach((t) => { map[t.id] = t; });
    return map;
  }, [ticketsSac]);

  async function handleUpdateStatus(table, id, newStatus) {
    await supabase.from(table).update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", id);
    loadAll();
  }

  // ────────────────── FORMULÁRIO: CONTRATOS ──────────────────
  const [showContratoForm, setShowContratoForm] = useState(false);
  const [savingContrato, setSavingContrato] = useState(false);
  const [ctTipo, setCtTipo] = useState("fornecedor");
  const [ctTitulo, setCtTitulo] = useState("");
  const [ctParteNome, setCtParteNome] = useState("");
  const [ctParteDocumento, setCtParteDocumento] = useState("");
  const [ctFuncionarioId, setCtFuncionarioId] = useState("");
  const [ctDataInicio, setCtDataInicio] = useState(todayDateInput());
  const [ctDataFim, setCtDataFim] = useState("");
  const [ctValor, setCtValor] = useState("");
  const [ctObservacoes, setCtObservacoes] = useState("");

  function resetContratoForm() {
    setCtTipo("fornecedor"); setCtTitulo(""); setCtParteNome(""); setCtParteDocumento("");
    setCtFuncionarioId(""); setCtDataInicio(todayDateInput()); setCtDataFim(""); setCtValor(""); setCtObservacoes("");
  }

  async function handleCreateContrato(e) {
    e.preventDefault();
    if (!ctTitulo.trim() || !ctDataInicio) return;
    if (ctTipo === "funcionario" && !ctFuncionarioId) return;
    if (ctTipo !== "funcionario" && !ctParteNome.trim()) return;

    setSavingContrato(true);
    const funcionarioNome = ctTipo === "funcionario" ? (employeeMap[ctFuncionarioId] || "") : ctParteNome.trim();

    await supabase.from("juridico_contratos").insert({
      tipo_contrato: ctTipo,
      titulo: ctTitulo.trim(),
      parte_nome: funcionarioNome,
      parte_documento: ctParteDocumento.trim() || null,
      funcionario_id: ctTipo === "funcionario" ? ctFuncionarioId : null,
      data_inicio: ctDataInicio,
      data_fim: ctDataFim || null,
      valor: ctValor ? parseFloat(ctValor) : null,
      observacoes: ctObservacoes.trim() || null,
      status: "Vigente",
    });

    resetContratoForm();
    setShowContratoForm(false);
    setSavingContrato(false);
    loadAll();
  }

  // ────────────────── FORMULÁRIO: OBRIGAÇÕES FISCAIS ──────────────────
  const [showFiscalForm, setShowFiscalForm] = useState(false);
  const [savingFiscal, setSavingFiscal] = useState(false);
  const [fsNome, setFsNome] = useState("");
  const [fsTipo, setFsTipo] = useState("Imposto");
  const [fsCompetencia, setFsCompetencia] = useState(todayDateInput().slice(0, 7)); // yyyy-mm
  const [fsVencimento, setFsVencimento] = useState(todayDateInput());
  const [fsValorEstimado, setFsValorEstimado] = useState("");
  const [fsObservacoes, setFsObservacoes] = useState("");

  function resetFiscalForm() {
    setFsNome(""); setFsTipo("Imposto"); setFsCompetencia(todayDateInput().slice(0, 7));
    setFsVencimento(todayDateInput()); setFsValorEstimado(""); setFsObservacoes("");
  }

  async function handleCreateFiscal(e) {
    e.preventDefault();
    if (!fsNome.trim() || !fsVencimento) return;
    setSavingFiscal(true);

    // Converte "2026-07" para "07/2026", formato usado na tela
    const [ano, mes] = fsCompetencia.split("-");
    const competenciaFormatada = `${mes}/${ano}`;

    await supabase.from("juridico_obrigacoes_fiscais").insert({
      nome: fsNome.trim(),
      tipo: fsTipo,
      competencia: competenciaFormatada,
      vencimento: fsVencimento,
      valor_estimado: fsValorEstimado ? parseFloat(fsValorEstimado) : null,
      observacoes: fsObservacoes.trim() || null,
      status: "Pendente",
    });

    resetFiscalForm();
    setShowFiscalForm(false);
    setSavingFiscal(false);
    loadAll();
  }

  // ────────────────── FORMULÁRIO: LGPD ──────────────────
  const [showLgpdForm, setShowLgpdForm] = useState(false);
  const [savingLgpd, setSavingLgpd] = useState(false);
  const [lgClienteNome, setLgClienteNome] = useState("");
  const [lgClienteContato, setLgClienteContato] = useState("");
  const [lgTipo, setLgTipo] = useState("Acesso aos Dados");
  const [lgDataSolicitacao, setLgDataSolicitacao] = useState(todayDateInput());

  function resetLgpdForm() {
    setLgClienteNome(""); setLgClienteContato(""); setLgTipo("Acesso aos Dados"); setLgDataSolicitacao(todayDateInput());
  }

  async function handleCreateLgpd(e) {
    e.preventDefault();
    if (!lgClienteNome.trim() || !lgClienteContato.trim()) return;
    setSavingLgpd(true);

    await supabase.from("juridico_lgpd_solicitacoes").insert({
      cliente_nome: lgClienteNome.trim(),
      cliente_contato: lgClienteContato.trim(),
      tipo_solicitacao: lgTipo,
      data_solicitacao: lgDataSolicitacao,
      status: "Recebida",
      // prazo_resposta é calculado sozinho pelo banco (data_solicitacao + 15 dias)
    });

    resetLgpdForm();
    setShowLgpdForm(false);
    setSavingLgpd(false);
    loadAll();
  }

  // ────────────────── FORMULÁRIO: RECLAMAÇÕES ──────────────────
  const [showReclamacaoForm, setShowReclamacaoForm] = useState(false);
  const [savingReclamacao, setSavingReclamacao] = useState(false);
  const [rcClienteNome, setRcClienteNome] = useState("");
  const [rcClienteContato, setRcClienteContato] = useState("");
  const [rcCanal, setRcCanal] = useState("Procon");
  const [rcProtocolo, setRcProtocolo] = useState("");
  const [rcDescricao, setRcDescricao] = useState("");
  const [rcDataReclamacao, setRcDataReclamacao] = useState(todayDateInput());
  const [rcPrazoResposta, setRcPrazoResposta] = useState("");
  const [rcTicketId, setRcTicketId] = useState("");

  function resetReclamacaoForm() {
    setRcClienteNome(""); setRcClienteContato(""); setRcCanal("Procon"); setRcProtocolo("");
    setRcDescricao(""); setRcDataReclamacao(todayDateInput()); setRcPrazoResposta(""); setRcTicketId("");
  }

  async function handleCreateReclamacao(e) {
    e.preventDefault();
    if (!rcClienteNome.trim() || !rcDescricao.trim()) return;
    setSavingReclamacao(true);

    await supabase.from("juridico_reclamacoes").insert({
      cliente_nome: rcClienteNome.trim(),
      cliente_contato: rcClienteContato.trim() || null,
      canal: rcCanal,
      numero_protocolo: rcProtocolo.trim() || null,
      descricao: rcDescricao.trim(),
      data_reclamacao: rcDataReclamacao,
      prazo_resposta: rcPrazoResposta || null,
      sac_chamado_id: rcTicketId || null,
      status: "Aberta",
    });

    resetReclamacaoForm();
    setShowReclamacaoForm(false);
    setSavingReclamacao(false);
    loadAll();
  }

  // ────────────────── FORMULÁRIO: DOCUMENTOS ──────────────────
  const [showDocumentoForm, setShowDocumentoForm] = useState(false);
  const [savingDocumento, setSavingDocumento] = useState(false);
  const [dcNome, setDcNome] = useState("");
  const [dcTipo, setDcTipo] = useState("Cadastro");
  const [dcNumero, setDcNumero] = useState("");
  const [dcOrgao, setDcOrgao] = useState("");
  const [dcDataEmissao, setDcDataEmissao] = useState("");
  const [dcDataValidade, setDcDataValidade] = useState("");

  function resetDocumentoForm() {
    setDcNome(""); setDcTipo("Cadastro"); setDcNumero(""); setDcOrgao(""); setDcDataEmissao(""); setDcDataValidade("");
  }

  async function handleCreateDocumento(e) {
    e.preventDefault();
    if (!dcNome.trim()) return;
    setSavingDocumento(true);

    await supabase.from("juridico_documentos").insert({
      nome: dcNome.trim(),
      tipo: dcTipo,
      numero_documento: dcNumero.trim() || null,
      orgao_emissor: dcOrgao.trim() || null,
      data_emissao: dcDataEmissao || null,
      data_validade: dcDataValidade || null,
    });

    resetDocumentoForm();
    setShowDocumentoForm(false);
    setSavingDocumento(false);
    loadAll();
  }

  // ────────────────── INDICADORES DE TOPO ──────────────────
  const obrigacoesPendentes = obrigacoes.filter((o) => o.status !== "Pago");
  const obrigacoesPendentesValor = obrigacoesPendentes.reduce((s, o) => s + Number(o.valor_estimado || 0), 0);
  const documentosVencendo = documentos.filter((d) => {
    const dias = daysUntil(d.data_validade);
    return dias !== null && dias <= 30;
  });
  const lgpdEstourados = lgpd.filter((l) => l.status !== "Concluída" && daysUntil(l.prazo_resposta) !== null && daysUntil(l.prazo_resposta) < 0);
  const reclamacoesAbertas = reclamacoes.filter((r) => r.status !== "Resolvida");

  return (
    <div>
      <Sidebar />
      <div style={styles.content}>
        <h1 style={styles.title}>Jurídico e Fiscal</h1>
        <p style={styles.subtitle}>Contratos, obrigações fiscais, LGPD, reclamações formais e documentos da empresa</p>

        <div style={styles.statsRow}>
          <div style={{ ...styles.statCard, ...(obrigacoesPendentes.length > 0 ? styles.statCardAlert : {}) }}>
            <div style={{ ...styles.statIcon, background: "#fef3c7" }}><Landmark size={16} color="#d97706" /></div>
            <div>
              <div style={styles.statValue}>{obrigacoesPendentes.length}</div>
              <div style={styles.statLabel}>Obrigações fiscais pendentes ({fmtMoney(obrigacoesPendentesValor)})</div>
            </div>
          </div>
          <div style={{ ...styles.statCard, ...(documentosVencendo.length > 0 ? styles.statCardAlert : {}) }}>
            <div style={{ ...styles.statIcon, background: "#fee2e2" }}><BadgeCheck size={16} color="#dc2626" /></div>
            <div>
              <div style={styles.statValue}>{documentosVencendo.length}</div>
              <div style={styles.statLabel}>Documentos vencendo em 30 dias</div>
            </div>
          </div>
          <div style={{ ...styles.statCard, ...(lgpdEstourados.length > 0 ? styles.statCardAlert : {}) }}>
            <div style={{ ...styles.statIcon, background: "#fee2e2" }}><ShieldCheck size={16} color="#dc2626" /></div>
            <div>
              <div style={styles.statValue}>{lgpdEstourados.length}</div>
              <div style={styles.statLabel}>Solicitações LGPD com prazo estourado</div>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statIcon, background: "#f0f0f0" }}><MessageSquareWarning size={16} color="#525252" /></div>
            <div>
              <div style={styles.statValue}>{reclamacoesAbertas.length}</div>
              <div style={styles.statLabel}>Reclamações em aberto</div>
            </div>
          </div>
        </div>

        <div style={styles.tabs}>
          <button onClick={() => setTab("contratos")} style={{ ...styles.tabButton, ...(tab === "contratos" ? styles.tabActive : {}) }}>Contratos</button>
          <button onClick={() => setTab("fiscal")} style={{ ...styles.tabButton, ...(tab === "fiscal" ? styles.tabActive : {}) }}>Obrigações Fiscais</button>
          <button onClick={() => setTab("lgpd")} style={{ ...styles.tabButton, ...(tab === "lgpd" ? styles.tabActive : {}) }}>LGPD</button>
          <button onClick={() => setTab("reclamacoes")} style={{ ...styles.tabButton, ...(tab === "reclamacoes" ? styles.tabActive : {}) }}>Reclamações</button>
          <button onClick={() => setTab("documentos")} style={{ ...styles.tabButton, ...(tab === "documentos" ? styles.tabActive : {}) }}>Documentos</button>
        </div>

        {loading ? (
          <p style={styles.empty}>Carregando…</p>
        ) : (
          <>
            {tab === "contratos" && (
              <>
                <p style={styles.explainer}>
                  <FileText size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                  Contratos com fornecedores, clientes e funcionários. Quando o tipo é "funcionário", escolha
                  a pessoa direto do cadastro do RH.
                </p>

                <button onClick={() => setShowContratoForm((v) => !v)} style={styles.newButton}>
                  <Plus size={16} /> Novo contrato
                </button>

                {showContratoForm && (
                  <form onSubmit={handleCreateContrato} style={styles.form}>
                    <div style={styles.row}>
                      <div style={{ flex: 1 }}>
                        <label style={styles.label}>Tipo *</label>
                        <select value={ctTipo} onChange={(e) => setCtTipo(e.target.value)} style={styles.input}>
                          <option value="fornecedor">Fornecedor</option>
                          <option value="cliente">Cliente</option>
                          <option value="funcionario">Funcionário</option>
                          <option value="outro">Outro</option>
                        </select>
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={styles.label}>Título *</label>
                        <input value={ctTitulo} onChange={(e) => setCtTitulo(e.target.value)} style={styles.input} placeholder="Ex: Contrato de fornecimento" required />
                      </div>
                    </div>

                    {ctTipo === "funcionario" ? (
                      <>
                        <label style={styles.label}>Funcionário (vem do RH) *</label>
                        <select value={ctFuncionarioId} onChange={(e) => setCtFuncionarioId(e.target.value)} style={styles.input} required>
                          <option value="">Selecione…</option>
                          {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.name} — {emp.department}</option>)}
                        </select>
                        {employees.length === 0 && <p style={styles.warnNote}>Nenhum funcionário cadastrado no RH ainda.</p>}
                      </>
                    ) : (
                      <>
                        <label style={styles.label}>Nome da parte *</label>
                        <input value={ctParteNome} onChange={(e) => setCtParteNome(e.target.value)} style={styles.input} required />
                      </>
                    )}

                    <label style={styles.label}>CPF/CNPJ</label>
                    <input value={ctParteDocumento} onChange={(e) => setCtParteDocumento(e.target.value)} style={styles.input} />

                    <div style={styles.row}>
                      <div style={{ flex: 1 }}>
                        <label style={styles.label}>Início *</label>
                        <input type="date" value={ctDataInicio} onChange={(e) => setCtDataInicio(e.target.value)} style={styles.input} required />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={styles.label}>Fim (vazio = indeterminado)</label>
                        <input type="date" value={ctDataFim} onChange={(e) => setCtDataFim(e.target.value)} style={styles.input} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={styles.label}>Valor (R$)</label>
                        <input type="number" step="0.01" min="0" value={ctValor} onChange={(e) => setCtValor(e.target.value)} style={styles.input} />
                      </div>
                    </div>

                    <label style={styles.label}>Observações</label>
                    <textarea value={ctObservacoes} onChange={(e) => setCtObservacoes(e.target.value)} style={{ ...styles.input, minHeight: 60 }} />

                    <button type="submit" style={styles.saveButton} disabled={savingContrato}>{savingContrato ? "Salvando…" : "Cadastrar contrato"}</button>
                  </form>
                )}

                {contratos.length === 0 ? (
                  <p style={styles.empty}>Nenhum contrato cadastrado ainda.</p>
                ) : (
                  <div style={styles.tableWrap}>
                    <table>
                      <thead>
                        <tr>
                          <th style={styles.th}>Tipo</th>
                          <th style={styles.th}>Parte / Funcionário</th>
                          <th style={styles.th}>Início</th>
                          <th style={styles.th}>Fim</th>
                          <th style={styles.th}>Valor</th>
                          <th style={styles.th}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {contratos.map((c) => {
                          const dias = daysUntil(c.data_fim);
                          const vencendo = dias !== null && dias <= 30 && dias >= 0;
                          return (
                            <tr key={c.id} style={{ ...styles.tr, ...(vencendo ? styles.trOverdue : {}) }}>
                              <td style={styles.td}>{c.tipo_contrato}</td>
                              <td style={styles.td}>
                                {c.tipo_contrato === "funcionario" && c.funcionario_id
                                  ? (employeeMap[c.funcionario_id] || "Funcionário não encontrado")
                                  : c.parte_nome}
                              </td>
                              <td style={styles.td}>{fmtDate(c.data_inicio)}</td>
                              <td style={styles.td}>
                                {fmtDate(c.data_fim)}
                                {vencendo && <span style={styles.overdueTag}> · vence em {dias}d</span>}
                              </td>
                              <td style={styles.td}>{fmtMoney(c.valor)}</td>
                              <td style={styles.td}>
                                <select value={c.status} onChange={(e) => handleUpdateStatus("juridico_contratos", c.id, e.target.value)} style={statusBadgeStyle(c.status)}>
                                  {STATUS_OPTIONS.contratos.map((s) => <option key={s} value={s}>{s}</option>)}
                                </select>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {tab === "fiscal" && (
              <>
                <p style={styles.explainer}>
                  <Landmark size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                  Ao cadastrar, uma conta a pagar é criada automaticamente no Financeiro, categoria "IMPOSTOS E TAXAS".
                </p>

                <button onClick={() => setShowFiscalForm((v) => !v)} style={styles.newButton}>
                  <Plus size={16} /> Nova obrigação fiscal
                </button>

                {showFiscalForm && (
                  <form onSubmit={handleCreateFiscal} style={styles.form}>
                    <label style={styles.label}>Nome *</label>
                    <input value={fsNome} onChange={(e) => setFsNome(e.target.value)} style={styles.input} placeholder="Ex: DAS - Simples Nacional" required />

                    <div style={styles.row}>
                      <div style={{ flex: 1 }}>
                        <label style={styles.label}>Tipo</label>
                        <select value={fsTipo} onChange={(e) => setFsTipo(e.target.value)} style={styles.input}>
                          <option value="Imposto">Imposto</option>
                          <option value="Taxa">Taxa</option>
                          <option value="Declaração">Declaração</option>
                          <option value="Contribuição">Contribuição</option>
                        </select>
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={styles.label}>Competência (mês de referência) *</label>
                        <input type="month" value={fsCompetencia} onChange={(e) => setFsCompetencia(e.target.value)} style={styles.input} required />
                      </div>
                    </div>

                    <div style={styles.row}>
                      <div style={{ flex: 1 }}>
                        <label style={styles.label}>Vencimento *</label>
                        <input type="date" value={fsVencimento} onChange={(e) => setFsVencimento(e.target.value)} style={styles.input} required />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={styles.label}>Valor estimado (R$)</label>
                        <input type="number" step="0.01" min="0" value={fsValorEstimado} onChange={(e) => setFsValorEstimado(e.target.value)} style={styles.input} />
                      </div>
                    </div>

                    <label style={styles.label}>Observações</label>
                    <textarea value={fsObservacoes} onChange={(e) => setFsObservacoes(e.target.value)} style={{ ...styles.input, minHeight: 60 }} />

                    <button type="submit" style={styles.saveButton} disabled={savingFiscal}>{savingFiscal ? "Salvando…" : "Cadastrar obrigação"}</button>
                  </form>
                )}

                {obrigacoes.length === 0 ? (
                  <p style={styles.empty}>Nenhuma obrigação fiscal cadastrada ainda.</p>
                ) : (
                  <div style={styles.tableWrap}>
                    <table>
                      <thead>
                        <tr>
                          <th style={styles.th}>Nome</th>
                          <th style={styles.th}>Tipo</th>
                          <th style={styles.th}>Competência</th>
                          <th style={styles.th}>Vencimento</th>
                          <th style={styles.th}>Valor estimado</th>
                          <th style={styles.th}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {obrigacoes.map((o) => (
                          <tr key={o.id} style={styles.tr}>
                            <td style={styles.td}>{o.nome}</td>
                            <td style={styles.td}>{o.tipo}</td>
                            <td style={styles.td}>{o.competencia}</td>
                            <td style={styles.td}>{fmtDate(o.vencimento)}</td>
                            <td style={styles.td}>{fmtMoney(o.valor_estimado)}</td>
                            <td style={styles.td}>
                              <select value={o.status} onChange={(e) => handleUpdateStatus("juridico_obrigacoes_fiscais", o.id, e.target.value)} style={statusBadgeStyle(o.status)}>
                                {STATUS_OPTIONS.fiscal.map((s) => <option key={s} value={s}>{s}</option>)}
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {tab === "lgpd" && (
              <>
                <p style={styles.explainer}>
                  <ShieldCheck size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                  Solicitações de clientes sobre os próprios dados. O prazo de resposta (15 dias) é calculado automaticamente.
                </p>

                <button onClick={() => setShowLgpdForm((v) => !v)} style={styles.newButton}>
                  <Plus size={16} /> Nova solicitação
                </button>

                {showLgpdForm && (
                  <form onSubmit={handleCreateLgpd} style={styles.form}>
                    <div style={styles.row}>
                      <div style={{ flex: 1 }}>
                        <label style={styles.label}>Nome do cliente *</label>
                        <input value={lgClienteNome} onChange={(e) => setLgClienteNome(e.target.value)} style={styles.input} required />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={styles.label}>Contato (telefone/e-mail) *</label>
                        <input value={lgClienteContato} onChange={(e) => setLgClienteContato(e.target.value)} style={styles.input} required />
                      </div>
                    </div>
                    <div style={styles.row}>
                      <div style={{ flex: 1 }}>
                        <label style={styles.label}>Tipo de solicitação</label>
                        <select value={lgTipo} onChange={(e) => setLgTipo(e.target.value)} style={styles.input}>
                          <option value="Acesso aos Dados">Acesso aos Dados</option>
                          <option value="Correção">Correção</option>
                          <option value="Exclusão">Exclusão</option>
                          <option value="Portabilidade">Portabilidade</option>
                          <option value="Revogação de Consentimento">Revogação de Consentimento</option>
                        </select>
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={styles.label}>Data da solicitação</label>
                        <input type="date" value={lgDataSolicitacao} onChange={(e) => setLgDataSolicitacao(e.target.value)} style={styles.input} />
                      </div>
                    </div>

                    <button type="submit" style={styles.saveButton} disabled={savingLgpd}>{savingLgpd ? "Salvando…" : "Registrar solicitação"}</button>
                  </form>
                )}

                {lgpd.length === 0 ? (
                  <p style={styles.empty}>Nenhuma solicitação LGPD registrada ainda.</p>
                ) : (
                  <div style={styles.tableWrap}>
                    <table>
                      <thead>
                        <tr>
                          <th style={styles.th}>Cliente</th>
                          <th style={styles.th}>Tipo</th>
                          <th style={styles.th}>Solicitado em</th>
                          <th style={styles.th}>Prazo</th>
                          <th style={styles.th}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lgpd.map((l) => {
                          const estourado = l.status !== "Concluída" && daysUntil(l.prazo_resposta) < 0;
                          return (
                            <tr key={l.id} style={{ ...styles.tr, ...(estourado ? styles.trOverdue : {}) }}>
                              <td style={styles.td}>{l.cliente_nome}<br /><span style={styles.subtext}>{l.cliente_contato}</span></td>
                              <td style={styles.td}>{l.tipo_solicitacao}</td>
                              <td style={styles.td}>{fmtDate(l.data_solicitacao)}</td>
                              <td style={styles.td}>
                                {fmtDate(l.prazo_resposta)}
                                {estourado && <span style={styles.overdueTag}> · prazo estourado</span>}
                              </td>
                              <td style={styles.td}>
                                <select value={l.status} onChange={(e) => handleUpdateStatus("juridico_lgpd_solicitacoes", l.id, e.target.value)} style={statusBadgeStyle(l.status)}>
                                  {STATUS_OPTIONS.lgpd.map((s) => <option key={s} value={s}>{s}</option>)}
                                </select>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {tab === "reclamacoes" && (
              <>
                <p style={styles.explainer}>
                  <MessageSquareWarning size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                  Reclamações formais (Procon, Reclame Aqui, judicial) — diferente de um chamado comum do SAC.
                </p>

                <button onClick={() => setShowReclamacaoForm((v) => !v)} style={styles.newButton}>
                  <Plus size={16} /> Nova reclamação
                </button>

                {showReclamacaoForm && (
                  <form onSubmit={handleCreateReclamacao} style={styles.form}>
                    <div style={styles.row}>
                      <div style={{ flex: 1 }}>
                        <label style={styles.label}>Nome do cliente *</label>
                        <input value={rcClienteNome} onChange={(e) => setRcClienteNome(e.target.value)} style={styles.input} required />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={styles.label}>Contato</label>
                        <input value={rcClienteContato} onChange={(e) => setRcClienteContato(e.target.value)} style={styles.input} />
                      </div>
                    </div>
                    <div style={styles.row}>
                      <div style={{ flex: 1 }}>
                        <label style={styles.label}>Canal</label>
                        <select value={rcCanal} onChange={(e) => setRcCanal(e.target.value)} style={styles.input}>
                          <option value="Procon">Procon</option>
                          <option value="Reclame Aqui">Reclame Aqui</option>
                          <option value="Judicial">Judicial</option>
                          <option value="Outro">Outro</option>
                        </select>
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={styles.label}>Nº do protocolo</label>
                        <input value={rcProtocolo} onChange={(e) => setRcProtocolo(e.target.value)} style={styles.input} />
                      </div>
                    </div>

                    <label style={styles.label}>Descrição *</label>
                    <textarea value={rcDescricao} onChange={(e) => setRcDescricao(e.target.value)} style={{ ...styles.input, minHeight: 70 }} required />

                    <div style={styles.row}>
                      <div style={{ flex: 1 }}>
                        <label style={styles.label}>Data da reclamação</label>
                        <input type="date" value={rcDataReclamacao} onChange={(e) => setRcDataReclamacao(e.target.value)} style={styles.input} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={styles.label}>Prazo de resposta (do órgão)</label>
                        <input type="date" value={rcPrazoResposta} onChange={(e) => setRcPrazoResposta(e.target.value)} style={styles.input} />
                      </div>
                    </div>

                    <label style={styles.label}>Chamado do SAC relacionado (opcional)</label>
                    <select value={rcTicketId} onChange={(e) => setRcTicketId(e.target.value)} style={styles.input}>
                      <option value="">Nenhum — reclamação veio direto de fora</option>
                      {ticketsSac.map((t) => (
                        <option key={t.id} value={t.id}>{t.subject} — {t.customer_name}</option>
                      ))}
                    </select>
                    <p style={styles.helperText}>
                      Selecione se essa reclamação começou como um chamado do SAC que escalou para Procon/judicial.
                    </p>

                    <button type="submit" style={styles.saveButton} disabled={savingReclamacao}>{savingReclamacao ? "Salvando…" : "Registrar reclamação"}</button>
                  </form>
                )}

                {reclamacoes.length === 0 ? (
                  <p style={styles.empty}>Nenhuma reclamação formal registrada ainda.</p>
                ) : (
                  <div style={styles.tableWrap}>
                    <table>
                      <thead>
                        <tr>
                          <th style={styles.th}>Cliente</th>
                          <th style={styles.th}>Canal</th>
                          <th style={styles.th}>Protocolo</th>
                          <th style={styles.th}>Chamado SAC</th>
                          <th style={styles.th}>Data</th>
                          <th style={styles.th}>Prazo</th>
                          <th style={styles.th}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reclamacoes.map((r) => {
                          const ticket = r.sac_chamado_id ? ticketMap[r.sac_chamado_id] : null;
                          return (
                            <tr key={r.id} style={styles.tr}>
                              <td style={styles.td}>{r.cliente_nome}</td>
                              <td style={styles.td}>{r.canal}</td>
                              <td style={styles.td}>{r.numero_protocolo || "—"}</td>
                              <td style={styles.td}>
                                {ticket ? <span style={styles.linkedTag}>{ticket.subject}</span> : "—"}
                              </td>
                              <td style={styles.td}>{fmtDate(r.data_reclamacao)}</td>
                              <td style={styles.td}>{fmtDate(r.prazo_resposta)}</td>
                              <td style={styles.td}>
                                <select value={r.status} onChange={(e) => handleUpdateStatus("juridico_reclamacoes", r.id, e.target.value)} style={statusBadgeStyle(r.status)}>
                                  {STATUS_OPTIONS.reclamacoes.map((s) => <option key={s} value={s}>{s}</option>)}
                                </select>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {tab === "documentos" && (
              <>
                <p style={styles.explainer}>
                  <BadgeCheck size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                  CNPJ, alvará e certidões da empresa. Documentos vencendo em até 30 dias aparecem destacados aqui e no card do topo.
                </p>

                <button onClick={() => setShowDocumentoForm((v) => !v)} style={styles.newButton}>
                  <Plus size={16} /> Novo documento
                </button>

                {showDocumentoForm && (
                  <form onSubmit={handleCreateDocumento} style={styles.form}>
                    <div style={styles.row}>
                      <div style={{ flex: 1 }}>
                        <label style={styles.label}>Nome *</label>
                        <input value={dcNome} onChange={(e) => setDcNome(e.target.value)} style={styles.input} placeholder="Ex: Alvará de Funcionamento" required />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={styles.label}>Tipo</label>
                        <select value={dcTipo} onChange={(e) => setDcTipo(e.target.value)} style={styles.input}>
                          <option value="Cadastro">Cadastro</option>
                          <option value="Licença">Licença</option>
                          <option value="Certidão">Certidão</option>
                          <option value="Outro">Outro</option>
                        </select>
                      </div>
                    </div>

                    <div style={styles.row}>
                      <div style={{ flex: 1 }}>
                        <label style={styles.label}>Nº do documento</label>
                        <input value={dcNumero} onChange={(e) => setDcNumero(e.target.value)} style={styles.input} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={styles.label}>Órgão emissor</label>
                        <input value={dcOrgao} onChange={(e) => setDcOrgao(e.target.value)} style={styles.input} placeholder="Ex: Prefeitura" />
                      </div>
                    </div>

                    <div style={styles.row}>
                      <div style={{ flex: 1 }}>
                        <label style={styles.label}>Data de emissão</label>
                        <input type="date" value={dcDataEmissao} onChange={(e) => setDcDataEmissao(e.target.value)} style={styles.input} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={styles.label}>Validade (vazio = sem validade)</label>
                        <input type="date" value={dcDataValidade} onChange={(e) => setDcDataValidade(e.target.value)} style={styles.input} />
                      </div>
                    </div>

                    <button type="submit" style={styles.saveButton} disabled={savingDocumento}>{savingDocumento ? "Salvando…" : "Cadastrar documento"}</button>
                  </form>
                )}

                {documentos.length === 0 ? (
                  <p style={styles.empty}>Nenhum documento cadastrado ainda.</p>
                ) : (
                  <div style={styles.tableWrap}>
                    <table>
                      <thead>
                        <tr>
                          <th style={styles.th}>Nome</th>
                          <th style={styles.th}>Tipo</th>
                          <th style={styles.th}>Órgão emissor</th>
                          <th style={styles.th}>Validade</th>
                        </tr>
                      </thead>
                      <tbody>
                        {documentos.map((d) => {
                          const dias = daysUntil(d.data_validade);
                          const vencendo = dias !== null && dias <= 30;
                          return (
                            <tr key={d.id} style={{ ...styles.tr, ...(vencendo ? styles.trOverdue : {}) }}>
                              <td style={styles.td}>{d.nome}</td>
                              <td style={styles.td}>{d.tipo}</td>
                              <td style={styles.td}>{d.orgao_emissor || "—"}</td>
                              <td style={styles.td}>
                                {d.data_validade ? fmtDate(d.data_validade) : "Sem validade"}
                                {vencendo && (
                                  <span style={styles.overdueTag}>
                                    {" "}· {dias < 0 ? "vencido" : `vence em ${dias}d`}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function JuridicoPage() {
  return (
    <AuthGate>
      <JuridicoContent />
    </AuthGate>
  );
}

const styles = {
  content: { padding: "24px 20px", maxWidth: 1100, margin: "0 auto" },
  title: { fontSize: 22, fontWeight: 700 },
  subtitle: { fontSize: 13, color: "#737373", marginBottom: 16 },
  statsRow: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 20 },
  statCard: { display: "flex", alignItems: "center", gap: 10, background: "#fff", border: "1px solid #e5e5e5", borderRadius: 12, padding: 14 },
  statCardAlert: { background: "#fef2f2", borderColor: "#fecaca" },
  statIcon: { width: 32, height: 32, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  statValue: { fontSize: 16, fontWeight: 700 },
  statLabel: { fontSize: 11, color: "#737373" },
  tabs: { display: "flex", gap: 4, marginBottom: 18, borderBottom: "1px solid #e5e5e5", flexWrap: "wrap" },
  tabButton: { border: "none", background: "none", padding: "10px 4px", marginRight: 20, fontSize: 13.5, fontWeight: 600, color: "#a3a3a3", cursor: "pointer", borderBottom: "2px solid transparent" },
  tabActive: { color: "#171717", borderBottomColor: "#171717" },
  explainer: { display: "flex", gap: 6, fontSize: 12, color: "#737373", background: "#fafafa", border: "1px solid #e5e5e5", borderRadius: 10, padding: "9px 12px", marginBottom: 18 },
  empty: { color: "#a3a3a3", fontSize: 13, padding: 24, textAlign: "center" },
  tableWrap: { background: "#fff", border: "1px solid #e5e5e5", borderRadius: 14, overflow: "auto" },
  th: { textAlign: "left", fontSize: 11, color: "#a3a3a3", textTransform: "uppercase", padding: "12px 14px", borderBottom: "1px solid #f0f0f0" },
  tr: { borderBottom: "1px solid #f5f5f5" },
  trOverdue: { background: "#fef2f2" },
  td: { padding: "10px 14px", fontSize: 13, verticalAlign: "middle" },
  subtext: { fontSize: 11, color: "#a3a3a3" },
  overdueTag: { color: "#dc2626", fontWeight: 700, fontSize: 11 },
  newButton: { display: "flex", alignItems: "center", gap: 6, background: "#171717", color: "#fff", padding: "10px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", marginBottom: 14 },
  form: { background: "#fff", border: "1px solid #e5e5e5", borderRadius: 14, padding: 16, marginBottom: 16, display: "flex", flexDirection: "column", maxWidth: 560 },
  row: { display: "flex", gap: 12 },
  label: { fontSize: 12, fontWeight: 600, color: "#525252", marginBottom: 4, marginTop: 12, display: "block" },
  input: { border: "1px solid #e5e5e5", borderRadius: 10, padding: "9px 12px", outline: "none", width: "100%", font: "inherit" },
  saveButton: { border: "none", background: "#171717", color: "#fff", borderRadius: 10, padding: "11px 18px", fontWeight: 600, fontSize: 13, cursor: "pointer", marginTop: 16 },
  warnNote: { fontSize: 12, color: "#d97706", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "9px 12px", marginTop: 10 },
  helperText: { fontSize: 11, color: "#a3a3a3", marginTop: 4 },
  linkedTag: { fontSize: 11, fontWeight: 600, background: "#dbeafe", color: "#2563eb", borderRadius: 999, padding: "3px 8px" },
};

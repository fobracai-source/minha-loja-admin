"use client";

import { useEffect, useMemo, useState } from "react";
import AuthGate from "../../components/AuthGate";
import Sidebar from "../../components/Sidebar";
import { supabase } from "../../lib/supabaseClient";
import {
  FileText, Landmark, ShieldCheck, MessageSquareWarning, BadgeCheck,
  AlertTriangle, Info,
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
  const diff = Math.ceil((new Date(d + "T00:00:00") - new Date(todayDateInput() + "T00:00:00")) / 86400000);
  return diff;
}

function JuridicoContent() {
  const [tab, setTab] = useState("contratos"); // contratos | fiscal | lgpd | reclamacoes | documentos
  const [loading, setLoading] = useState(true);

  const [contratos, setContratos] = useState([]);
  const [obrigacoes, setObrigacoes] = useState([]);
  const [lgpd, setLgpd] = useState([]);
  const [reclamacoes, setReclamacoes] = useState([]);
  const [documentos, setDocumentos] = useState([]);
  const [employees, setEmployees] = useState([]);

  async function loadAll() {
    setLoading(true);
    const [c, o, l, r, d, e] = await Promise.all([
      supabase.from("juridico_contratos").select("*").order("data_fim", { ascending: true, nullsFirst: false }),
      supabase.from("juridico_obrigacoes_fiscais").select("*").order("vencimento", { ascending: true }),
      supabase.from("juridico_lgpd_solicitacoes").select("*").order("prazo_resposta", { ascending: true }),
      supabase.from("juridico_reclamacoes").select("*").order("data_reclamacao", { ascending: false }),
      supabase.from("juridico_documentos").select("*").order("data_validade", { ascending: true, nullsFirst: false }),
      supabase.from("employees").select("id, name, department"),
    ]);
    setContratos(c.data || []);
    setObrigacoes(o.data || []);
    setLgpd(l.data || []);
    setReclamacoes(r.data || []);
    setDocumentos(d.data || []);
    setEmployees(e.data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  const employeeMap = useMemo(() => {
    const map = {};
    employees.forEach((e) => { map[e.id] = e.name; });
    return map;
  }, [employees]);

  // ── Indicadores de topo (visão geral, cruzando as 5 áreas) ──
  const obrigacoesPendentes = obrigacoes.filter((o) => o.status !== "Pago");
  const obrigacoesPendentesValor = obrigacoesPendentes.reduce((s, o) => s + Number(o.valor_estimado || 0), 0);
  const documentosVencendo = documentos.filter((d) => {
    const dias = daysUntil(d.data_validade);
    return dias !== null && dias <= 30;
  });
  const lgpdEstourados = lgpd.filter((l) => l.status !== "Concluída" && daysUntil(l.prazo_resposta) !== null && daysUntil(l.prazo_resposta) < 0);
  const reclamacoesAbertas = reclamacoes.filter((r) => !["Resolvida"].includes(r.status));

  return (
    <div>
      <Sidebar />
      <div style={styles.content}>
        <h1 style={styles.title}>Jurídico e Fiscal</h1>
        <p style={styles.subtitle}>Contratos, obrigações fiscais, LGPD, reclamações formais e documentos da empresa</p>

        {/* Cards de visão geral — cruzam as 5 áreas de uma vez */}
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
                  Contratos com fornecedores, clientes e funcionários. Quando o tipo é "funcionário", o
                  nome vem direto do cadastro do RH — cadastre a pessoa lá primeiro.
                </p>
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
                              <td style={styles.td}><span style={statusBadgeStyle(c.status)}>{c.status}</span></td>
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
                  Ao cadastrar uma obrigação fiscal aqui, uma conta a pagar é criada automaticamente
                  no Financeiro, na categoria "IMPOSTOS E TAXAS".
                </p>
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
                            <td style={styles.td}><span style={statusBadgeStyle(o.status)}>{o.status}</span></td>
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
                  Solicitações de clientes sobre os próprios dados (acesso, correção, exclusão). O prazo
                  padrão é de 15 dias a partir do pedido.
                </p>
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
                              <td style={styles.td}><span style={statusBadgeStyle(l.status)}>{l.status}</span></td>
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
                  Reclamações formais (Procon, Reclame Aqui, judicial) — diferente de um chamado comum
                  do SAC. A ligação automática com o SAC entra numa próxima etapa.
                </p>
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
                          <th style={styles.th}>Data</th>
                          <th style={styles.th}>Prazo</th>
                          <th style={styles.th}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reclamacoes.map((r) => (
                          <tr key={r.id} style={styles.tr}>
                            <td style={styles.td}>{r.cliente_nome}</td>
                            <td style={styles.td}>{r.canal}</td>
                            <td style={styles.td}>{r.numero_protocolo || "—"}</td>
                            <td style={styles.td}>{fmtDate(r.data_reclamacao)}</td>
                            <td style={styles.td}>{fmtDate(r.prazo_resposta)}</td>
                            <td style={styles.td}><span style={statusBadgeStyle(r.status)}>{r.status}</span></td>
                          </tr>
                        ))}
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
                  CNPJ, alvará e certidões da empresa. Documentos vencendo em até 30 dias aparecem
                  destacados aqui e no card de alerta no topo da página.
                </p>
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

function statusBadgeStyle(status) {
  const positive = ["Vigente", "Pago", "Concluída", "Resolvida"];
  const negative = ["Cancelado", "Atrasado", "Negada", "Escalada"];
  const base = { fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 999 };
  if (positive.includes(status)) return { ...base, background: "#dcfce7", color: "#16a34a" };
  if (negative.includes(status)) return { ...base, background: "#fee2e2", color: "#dc2626" };
  return { ...base, background: "#f0f0f0", color: "#737373" };
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
};

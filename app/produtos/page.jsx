"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AuthGate from "../../components/AuthGate";
import Sidebar from "../../components/Sidebar";
import { supabase } from "../../lib/supabaseClient";
import { Plus, Pencil, Trash2, Search, AlertTriangle } from "lucide-react";

function ProdutosContent() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [onlyZeroStock, setOnlyZeroStock] = useState(false);

  async function loadProducts() {
    setLoading(true);
    const { data } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });
    setProducts(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadProducts();
  }, []);

  async function handleDelete(id, name) {
    if (!confirm(`Excluir "${name}"? Essa ação não pode ser desfeita.`)) return;
    await supabase.from("products").delete().eq("id", id);
    loadProducts();
  }

  const zeroStockCount = products.filter((p) => p.stock === 0).length;

  const filtered = products
    .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    .filter((p) => !onlyZeroStock || p.stock === 0);

  return (
    <div>
      <Sidebar />
      <div style={styles.content}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Produtos</h1>
            <p style={styles.subtitle}>{products.length} cadastrados</p>
          </div>
          <Link href="/produtos/novo" style={styles.newButton}>
            <Plus size={16} /> Novo produto
          </Link>
        </div>

        {zeroStockCount > 0 && (
          <button
            onClick={() => setOnlyZeroStock((v) => !v)}
            style={{ ...styles.zeroStockBanner, ...(onlyZeroStock ? styles.zeroStockBannerActive : {}) }}
          >
            <AlertTriangle size={15} />
            {zeroStockCount} produto(s) com estoque zerado
            {onlyZeroStock ? " · mostrando só esses (clique para ver todos)" : " · clique para ver a lista"}
          </button>
        )}

        <div style={styles.searchBox}>
          <Search size={16} color="#a3a3a3" />
          <input
            placeholder="Buscar produto…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        {loading ? (
          <p style={styles.empty}>Carregando…</p>
        ) : filtered.length === 0 ? (
          <p style={styles.empty}>Nenhum produto encontrado.</p>
        ) : (
          <div style={styles.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th style={styles.th}></th>
                  <th style={styles.th}>Nome</th>
                  <th style={styles.th}>SKU</th>
                  <th style={styles.th}>Categoria</th>
                  <th style={styles.th}>Preço</th>
                  <th style={styles.th}>Estoque</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} style={{ ...styles.tr, ...(p.stock === 0 ? styles.trZeroStock : {}) }}>
                    <td style={styles.td}>
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} style={styles.thumb} />
                      ) : (
                        <div style={styles.thumbPlaceholder} />
                      )}
                    </td>
                    <td style={styles.td}>{p.name}</td>
                    <td style={styles.td}>{p.sku || "—"}</td>
                    <td style={styles.td}>{p.category || "—"}</td>
                    <td style={styles.td}>
                      {p.promotional_price ? (
                        <>
                          <span style={styles.oldPrice}>R$ {Number(p.price).toFixed(2).replace(".", ",")}</span>
                          {" "}R$ {Number(p.promotional_price).toFixed(2).replace(".", ",")}
                        </>
                      ) : (
                        `R$ ${Number(p.price).toFixed(2).replace(".", ",")}`
                      )}
                    </td>
                    <td style={styles.td}>
                      <span style={p.stock === 0 ? styles.stockZeroBadge : {}}>{p.stock}</span>
                    </td>
                    <td style={styles.td}>
                      <span style={{ ...styles.badge, ...(p.active ? styles.badgeActive : styles.badgeInactive) }}>
                        {p.active ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.actions}>
                        <Link href={`/produtos/${p.id}`} style={styles.iconButton}>
                          <Pencil size={14} />
                        </Link>
                        <button
                          onClick={() => handleDelete(p.id, p.name)}
                          style={{ ...styles.iconButton, color: "#dc2626" }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
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

export default function ProdutosPage() {
  return (
    <AuthGate>
      <ProdutosContent />
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
    borderRadius: 10, fontSize: 13, fontWeight: 600,
  },
  searchBox: {
    display: "flex", alignItems: "center", gap: 8,
    border: "1px solid #e5e5e5", borderRadius: 10, padding: "8px 12px",
    marginBottom: 16, maxWidth: 320, background: "#fff",
  },
  searchInput: { border: "none", outline: "none", flex: 1 },
  empty: { color: "#a3a3a3", fontSize: 13, padding: 24, textAlign: "center" },
  tableWrap: { background: "#fff", border: "1px solid #e5e5e5", borderRadius: 14, overflow: "auto" },
  th: { textAlign: "left", fontSize: 11, color: "#a3a3a3", textTransform: "uppercase", padding: "12px 14px", borderBottom: "1px solid #f0f0f0" },
  tr: { borderBottom: "1px solid #f5f5f5" },
  td: { padding: "10px 14px", fontSize: 13, verticalAlign: "middle" },
  thumb: { width: 36, height: 36, borderRadius: 8, objectFit: "cover" },
  thumbPlaceholder: { width: 36, height: 36, borderRadius: 8, background: "#f0f0f0" },
  badge: { fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 999 },
  badgeActive: { background: "#dcfce7", color: "#16a34a" },
  badgeInactive: { background: "#f0f0f0", color: "#a3a3a3" },
  actions: { display: "flex", gap: 6 },
  iconButton: {
    width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
    borderRadius: 8, border: "1px solid #e5e5e5", background: "#fff", cursor: "pointer",
  },
  zeroStockBanner: {
    display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left",
    background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 12,
    padding: "10px 14px", fontSize: 13, fontWeight: 600, marginBottom: 14, cursor: "pointer",
  },
  zeroStockBannerActive: { background: "#dc2626", color: "#fff", borderColor: "#dc2626" },
  trZeroStock: { background: "#fef2f2" },
  stockZeroBadge: { color: "#dc2626", fontWeight: 700 },
  oldPrice: { color: "#a3a3a3", textDecoration: "line-through", fontSize: 11, marginRight: 4 },
};

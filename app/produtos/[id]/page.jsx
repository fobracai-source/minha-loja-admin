"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import AuthGate from "../../../components/AuthGate";
import Sidebar from "../../../components/Sidebar";
import ProductForm from "../../../components/ProductForm";
import { supabase } from "../../../lib/supabaseClient";

function EditarProdutoContent() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProduct() {
      const { data } = await supabase.from("products").select("*").eq("id", id).single();
      setProduct(data);
      setLoading(false);
    }
    loadProduct();
  }, [id]);

  return (
    <div>
      <Sidebar />
      <div style={styles.content}>
        <h1 style={styles.title}>Editar produto</h1>
        <p style={styles.subtitle}>Altere os dados e salve</p>
        {loading ? (
          <p style={{ color: "#a3a3a3", fontSize: 13 }}>Carregando…</p>
        ) : product ? (
          <ProductForm initialProduct={product} />
        ) : (
          <p style={{ color: "#a3a3a3", fontSize: 13 }}>Produto não encontrado.</p>
        )}
      </div>
    </div>
  );
}

export default function EditarProdutoPage() {
  return (
    <AuthGate>
      <EditarProdutoContent />
    </AuthGate>
  );
}

const styles = {
  content: { padding: "24px 20px", maxWidth: 1000, margin: "0 auto" },
  title: { fontSize: 22, fontWeight: 700 },
  subtitle: { fontSize: 13, color: "#737373", marginBottom: 20 },
};

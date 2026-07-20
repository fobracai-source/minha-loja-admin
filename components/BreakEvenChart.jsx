"use client";

function fmtShort(v) {
  if (v >= 1000) return `R$ ${(v / 1000).toFixed(1).replace(".", ",")}k`;
  return `R$ ${v.toFixed(0)}`;
}

export default function BreakEvenChart({ fixedCosts, variableCostRate, breakEvenValue }) {
  const width = 640;
  const height = 340;
  const padding = { top: 20, right: 20, bottom: 40, left: 64 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  const maxRevenue = breakEvenValue > 0 ? breakEvenValue * 2 : 1000;
  const maxY = maxRevenue;

  function x(value) {
    return padding.left + (value / maxRevenue) * plotW;
  }
  function y(value) {
    return padding.top + plotH - (value / maxY) * plotH;
  }

  const receitaPoints = `${x(0)},${y(0)} ${x(maxRevenue)},${y(maxRevenue)}`;
  const custosPoints = `${x(0)},${y(fixedCosts)} ${x(maxRevenue)},${y(fixedCosts + variableCostRate * maxRevenue)}`;

  const bePixelX = x(breakEvenValue);
  const bePixelY = y(breakEvenValue);

  // Área de lucro (acima do ponto de equilíbrio, entre receita e custos)
  const profitArea = `${bePixelX},${bePixelY} ${x(maxRevenue)},${y(maxRevenue)} ${x(maxRevenue)},${y(fixedCosts + variableCostRate * maxRevenue)} ${bePixelX},${bePixelY}`;
  // Área de prejuízo (abaixo do ponto de equilíbrio)
  const lossArea = `${x(0)},${y(0)} ${bePixelX},${bePixelY} ${x(0)},${y(fixedCosts)} ${x(0)},${y(0)}`;

  const yTicks = [0, maxY * 0.25, maxY * 0.5, maxY * 0.75, maxY];
  const xTicks = [0, maxRevenue * 0.25, maxRevenue * 0.5, maxRevenue * 0.75, maxRevenue];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", maxWidth: 640, height: "auto" }}>
      {/* Grade */}
      {yTicks.map((t, i) => (
        <line key={i} x1={padding.left} y1={y(t)} x2={width - padding.right} y2={y(t)} stroke="#f0f0f0" strokeWidth="1" />
      ))}

      {/* Área de prejuízo */}
      <polygon points={lossArea} fill="#fee2e2" opacity="0.6" />
      {/* Área de lucro */}
      <polygon points={profitArea} fill="#dcfce7" opacity="0.6" />

      {/* Linha de custos fixos */}
      <line x1={x(0)} y1={y(fixedCosts)} x2={width - padding.right} y2={y(fixedCosts)} stroke="#d4d4d4" strokeWidth="1.5" strokeDasharray="4 4" />

      {/* Linha de custos totais */}
      <polyline points={custosPoints} fill="none" stroke="#dc2626" strokeWidth="2.5" />
      {/* Linha de receita total */}
      <polyline points={receitaPoints} fill="none" stroke="#16a34a" strokeWidth="2.5" />

      {/* Ponto de equilíbrio */}
      <circle cx={bePixelX} cy={bePixelY} r="5" fill="#171717" />
      <line x1={bePixelX} y1={bePixelY} x2={bePixelX} y2={y(0)} stroke="#171717" strokeWidth="1" strokeDasharray="3 3" />

      {/* Eixos */}
      <line x1={padding.left} y1={y(0)} x2={width - padding.right} y2={y(0)} stroke="#a3a3a3" strokeWidth="1" />
      <line x1={padding.left} y1={padding.top} x2={padding.left} y2={y(0)} stroke="#a3a3a3" strokeWidth="1" />

      {/* Rótulos eixo Y */}
      {yTicks.map((t, i) => (
        <text key={i} x={padding.left - 8} y={y(t) + 4} fontSize="10.5" fill="#a3a3a3" textAnchor="end">{fmtShort(t)}</text>
      ))}
      {/* Rótulos eixo X */}
      {xTicks.map((t, i) => (
        <text key={i} x={x(t)} y={height - padding.bottom + 16} fontSize="10.5" fill="#a3a3a3" textAnchor="middle">{fmtShort(t)}</text>
      ))}

      <text x={width / 2} y={height - 4} fontSize="11" fill="#737373" textAnchor="middle">Receita (R$)</text>

      {/* Legenda */}
      <g transform={`translate(${padding.left}, ${padding.top - 6})`}>
        <line x1="0" y1="0" x2="16" y2="0" stroke="#16a34a" strokeWidth="2.5" />
        <text x="20" y="4" fontSize="10.5" fill="#525252">Receita Total</text>
        <line x1="110" y1="0" x2="126" y2="0" stroke="#dc2626" strokeWidth="2.5" />
        <text x="130" y="4" fontSize="10.5" fill="#525252">Custos Totais</text>
        <line x1="230" y1="0" x2="246" y2="0" stroke="#d4d4d4" strokeWidth="1.5" strokeDasharray="4 4" />
        <text x="250" y="4" fontSize="10.5" fill="#525252">Custos Fixos</text>
      </g>
    </svg>
  );
}

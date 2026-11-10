import React, { useState } from 'react';
import { Producto, KardexMovimiento, ActaSalida } from '../types';
import { fmtMoney } from '../utils/format';

interface MobileViewProps {
  productos: Producto[];
  kardex: KardexMovimiento[];
  actas: ActaSalida[];
  usuario: string;
  onOpenQRScanner: () => void;
  onOpenDespachoContinuo?: () => void;
  onOpenOCR?: () => void;
  onOpenEntrada: () => void;
  onOpenSalida: () => void;
  onOpenProductQR: (p: Producto) => void;
  onSwitchToPC: () => void;
  onLogout: () => void;
  onHelp?: () => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

export const MobileView: React.FC<MobileViewProps> = ({
  productos,
  kardex,
  actas,
  usuario,
  onOpenQRScanner,
  onOpenDespachoContinuo,
  onOpenOCR,
  onOpenEntrada,
  onOpenSalida,
  onOpenProductQR,
  onSwitchToPC,
  onLogout,
  onHelp,
  theme = 'dark',
  onToggleTheme,
}) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'kardex' | 'actas'>('dashboard');
  const [searchMovil, setSearchMovil] = useState('');

  const activos = productos.filter((p) => p.estado === 'Activo');
  const valorTotal = activos.reduce((acc, p) => acc + p.stock * p.valor, 0);
  const criticos = activos.filter((p) => p.stock <= p.stockMin).length;

  const searchResults = searchMovil.length >= 2
    ? activos
        .filter(
          (p) =>
            p.codigo.toLowerCase().includes(searchMovil.toLowerCase()) ||
            p.desc.toLowerCase().includes(searchMovil.toLowerCase())
        )
        .slice(0, 5)
    : [];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: 'var(--bg-gradient)',
        fontFamily: 'var(--font)',
      }}
    >
      {/* Header móvil */}
      <div
        style={{
          background: 'var(--panel)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          padding: '10px 14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid var(--border)',
          boxShadow: 'var(--glass-inner-light)',
        }}
      >
        <div>
          <div style={{ fontSize: '12.5px', fontWeight: 800, color: 'var(--cyan)', letterSpacing: '0.3px' }}>
            🏥 BODEGA DE TRÁNSITO HAH
          </div>
          <div style={{ fontSize: '10px', color: 'var(--muted)', fontWeight: 600 }}>
            Inventario Oficial · {usuario}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <span
            style={{
              fontSize: '10px',
              background: theme === 'light' ? '#bfdcf7' : '#001a2a',
              border: theme === 'light' ? '1px solid #38bdf8' : '1px solid var(--cyan)',
              borderRadius: '20px',
              padding: '2px 7px',
              color: theme === 'light' ? '#026aa7' : 'var(--cyan)',
              fontWeight: 700,
            }}
          >
            ⚠ {criticos}
          </span>
          <button
            onClick={onLogout}
            style={{
              background: theme === 'light' ? '#fbd5d9' : '#1a0008',
              border: '1px solid var(--red)',
              borderRadius: '6px',
              color: 'var(--red)',
              fontSize: '11px',
              padding: '4px 6px',
              cursor: 'pointer',
            }}
          >
            🔒
          </button>
        </div>
      </div>

      {/* Contenido según pestaña */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {activeTab === 'dashboard' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', padding: '10px' }}>
              <div
                style={{
                  background: 'var(--panel)',
                  borderRadius: '10px',
                  padding: '10px',
                  textAlign: 'center',
                  border: '1px solid var(--border)',
                }}
              >
                <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--cyan)' }}>
                  {fmtMoney(valorTotal)}
                </div>
                <div style={{ fontSize: '9px', color: 'var(--muted)' }}>VALOR INVENTARIO</div>
              </div>
              <div
                style={{
                  background: 'var(--panel)',
                  borderRadius: '10px',
                  padding: '10px',
                  textAlign: 'center',
                  border: '1px solid var(--border)',
                }}
              >
                <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--red)' }}>
                  {criticos}
                </div>
                <div style={{ fontSize: '9px', color: 'var(--muted)' }}>STOCK CRÍTICO</div>
              </div>
            </div>

            <div style={{ padding: '0 10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                onClick={onOpenQRScanner}
                style={{
                  background: 'linear-gradient(135deg, #003366, #005599)',
                  border: '2px solid var(--cyan)',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '16px',
                  fontWeight: 700,
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                📷 Escanear QR
              </button>
              {onOpenOCR && (
                <button
                  onClick={onOpenOCR}
                  style={{
                    background: 'linear-gradient(135deg, #0940cd, #1557ff)',
                    border: '2px solid #74a0ff',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '15px',
                    fontWeight: 700,
                    padding: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 14px rgba(9, 64, 205, 0.4)',
                  }}
                >
                  ✨ Escaneo OCR con IA (Trazabilidad)
                </button>
              )}
              {onOpenDespachoContinuo && (
                <button
                  onClick={onOpenDespachoContinuo}
                  style={{
                    background: 'linear-gradient(135deg, #0284c7, #00d4ff)',
                    border: '2px solid #38bdf8',
                    borderRadius: '12px',
                    color: '#001a2a',
                    fontSize: '15px',
                    fontWeight: 800,
                    padding: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 14px rgba(0, 212, 255, 0.4)',
                  }}
                >
                  🔫 Ingreso / Despacho (Pistola)
                </button>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  onClick={onOpenEntrada}
                  style={{
                    background: theme === 'light' ? '#c3f3d7' : '#001a0a',
                    border: '2px solid var(--green)',
                    borderRadius: '10px',
                    color: theme === 'light' ? '#047857' : 'var(--green)',
                    fontSize: '14px',
                    fontWeight: 700,
                    padding: '12px',
                    boxShadow: theme === 'light' ? '0 0 8px rgba(16, 185, 129, 0.3)' : undefined,
                  }}
                >
                  ▼ Entrada
                </button>
                <button
                  onClick={onOpenSalida}
                  style={{
                    background: theme === 'light' ? '#fbd5d9' : '#1a0008',
                    border: '2px solid var(--red)',
                    borderRadius: '10px',
                    color: theme === 'light' ? '#b91c1c' : 'var(--red)',
                    fontSize: '14px',
                    fontWeight: 700,
                    padding: '12px',
                    boxShadow: theme === 'light' ? '0 0 8px rgba(239, 68, 68, 0.3)' : undefined,
                  }}
                >
                  ▲ Salida
                </button>
              </div>
            </div>

            <div style={{ padding: '10px' }}>
              <input
                className="field-input"
                value={searchMovil}
                placeholder="🔍 Buscar producto..."
                style={{ width: '100%', fontSize: '13px', padding: '10px' }}
                onChange={(e) => setSearchMovil(e.target.value)}
              />
              <div style={{ marginTop: '6px' }}>
                {searchResults.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => onOpenProductQR(p)}
                    style={{
                      padding: '8px 10px',
                      background: 'var(--input)',
                      borderRadius: '6px',
                      marginBottom: '4px',
                      cursor: 'pointer',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <span style={{ color: 'var(--cyan)', fontWeight: 700 }}>{p.codigo}</span>
                    <span style={{ color: 'var(--text)', fontSize: '12px' }}> – {p.desc}</span>
                    <span
                      style={{
                        float: 'right',
                        color: p.stock <= p.stockMin ? 'var(--red)' : 'var(--green)',
                        fontWeight: 700,
                      }}
                    >
                      {p.stock} uds.
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'kardex' && (
          <div style={{ padding: '10px' }}>
            {kardex.slice(0, 30).map((m) => (
              <div
                key={m.id}
                style={{
                  padding: '8px 10px',
                  background: 'var(--input)',
                  borderRadius: '6px',
                  marginBottom: '6px',
                  border: '1px solid var(--border)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                  <span
                    style={{
                      fontWeight: 700,
                      color: m.tipo === 'ENTRADA' ? 'var(--green)' : 'var(--red)',
                    }}
                  >
                    {m.tipo}
                  </span>
                  <span style={{ color: 'var(--muted)' }}>{m.fecha}</span>
                </div>
                <div style={{ color: 'var(--cyan)', fontWeight: 700, marginTop: '2px' }}>
                  {m.codigo} - {m.producto}
                </div>
                <div style={{ color: 'var(--muted)', fontSize: '11px' }}>
                  Cantidad: {m.cantidad} uds.
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'actas' && (
          <div style={{ padding: '10px' }}>
            {(actas || []).map((a, idx) => (
              <div
                key={`${a?.id || 'acta'}-${idx}`}
                style={{
                  padding: '8px 10px',
                  background: 'var(--input)',
                  borderRadius: '6px',
                  marginBottom: '6px',
                  border: '1px solid var(--border)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--cyan)', fontWeight: 700 }}>{a?.id}</span>
                  <span style={{ fontSize: '10px', color: 'var(--muted)' }}>{a?.fecha}</span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text)' }}>{a?.servicio}</div>
                <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                  {(a?.items || []).length} insumo(s) despachado(s)
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Navegación inferior */}
      <div
        style={{
          borderTop: '1px solid var(--border)',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          background: 'var(--panel)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.15)',
        }}
      >
        <button
          onClick={() => setActiveTab('dashboard')}
          style={{
            padding: '10px 4px',
            background: 'none',
            border: 'none',
            color: activeTab === 'dashboard' ? 'var(--cyan)' : 'var(--muted)',
            fontSize: '10px',
            borderTop: activeTab === 'dashboard' ? '2px solid var(--cyan)' : '2px solid transparent',
          }}
        >
          🏠<br />Panel
        </button>
        <button
          onClick={() => setActiveTab('kardex')}
          style={{
            padding: '10px 4px',
            background: 'none',
            border: 'none',
            color: activeTab === 'kardex' ? 'var(--cyan)' : 'var(--muted)',
            fontSize: '10px',
            borderTop: activeTab === 'kardex' ? '2px solid var(--cyan)' : '2px solid transparent',
          }}
        >
          📋<br />Kardex
        </button>
        <button
          onClick={() => setActiveTab('actas')}
          style={{
            padding: '10px 4px',
            background: 'none',
            border: 'none',
            color: activeTab === 'actas' ? 'var(--cyan)' : 'var(--muted)',
            fontSize: '10px',
            borderTop: activeTab === 'actas' ? '2px solid var(--cyan)' : '2px solid transparent',
          }}
        >
          📤<br />Actas
        </button>
        <button
          onClick={onSwitchToPC}
          style={{
            padding: '10px 4px',
            background: 'none',
            border: 'none',
            color: 'var(--muted)',
            fontSize: '10px',
          }}
        >
          🖥️<br />PC
        </button>
      </div>
    </div>
  );
};

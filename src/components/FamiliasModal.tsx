import React, { useState } from 'react';
import { FamiliaCatalogo, Producto } from '../types';

interface FamiliasModalProps {
  isOpen: boolean;
  onClose: () => void;
  familias: FamiliaCatalogo[];
  productos: Producto[];
  onAddFamilia: (nueva: FamiliaCatalogo) => void;
  onDeleteFamilia: (id: string) => void;
}

export const FamiliasModal: React.FC<FamiliasModalProps> = ({
  isOpen,
  onClose,
  familias,
  productos,
  onAddFamilia,
  onDeleteFamilia,
}) => {
  const [showForm, setShowForm] = useState(false);
  const [id, setId] = useState('');
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [color, setColor] = useState('cyan');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = id.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!cleanId) {
      setError('El código o prefijo de la familia es obligatorio (ej. FAR, MAT)');
      return;
    }
    if (familias.some((f) => f.id.toUpperCase() === cleanId)) {
      setError(`Ya existe una familia con el código "${cleanId}"`);
      return;
    }
    if (!nombre.trim()) {
      setError('El nombre de la familia es obligatorio');
      return;
    }

    onAddFamilia({
      id: cleanId,
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || `Familia de productos ${cleanId}`,
      esFija: false,
      color,
    });

    setId('');
    setNombre('');
    setDescripcion('');
    setError('');
    setShowForm(false);
  };

  return (
    <div className="modal-overlay open" onClick={onClose} style={{ zIndex: 1120 }}>
      <div
        className="modal"
        style={{
          width: '680px',
          maxWidth: '96vw',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          background: '#0a1329',
          border: '1.5px solid #00d4ff',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 25px 60px -10px rgba(0, 212, 255, 0.25)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
            borderBottom: '1px solid #1a2d54',
            paddingBottom: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>📁</span>
            <div>
              <div style={{ color: '#00e5ff', fontSize: '18px', fontWeight: 800 }}>
                Maestro de Familias y Categorías
              </div>
              <div style={{ color: '#8ab0cc', fontSize: '12px' }}>
                Familias oficiales del catálogo de insumos y productos — HAH
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#8ab0cc',
              fontSize: '20px',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        {/* Action Bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>
            Total familias registradas: <strong style={{ color: '#38bdf8' }}>{familias.length}</strong>
          </div>
          <button
            className="btn btn-cyan btn-sm"
            onClick={() => {
              setShowForm(!showForm);
              setError('');
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px' }}
          >
            {showForm ? '✕ Cerrar Formulario' : '➕ Crear Nueva Familia'}
          </button>
        </div>

        {/* Creation Form */}
        {showForm && (
          <form
            onSubmit={handleSubmit}
            style={{
              background: '#0f1c38',
              border: '1px solid #1e3a6e',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px',
            }}
          >
            <div style={{ fontWeight: 700, fontSize: '14px', color: '#38bdf8', marginBottom: '12px' }}>
              Registrar Nueva Familia en el Catálogo
            </div>
            {error && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid #ef4444',
                  color: '#fca5a5',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  marginBottom: '12px',
                }}
              >
                ⚠️ {error}
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px', marginBottom: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                  Prefijo / Código (ej. FAR, MAT) *
                </label>
                <input
                  className="field-input"
                  value={id}
                  maxLength={5}
                  placeholder="FAR"
                  style={{ textTransform: 'uppercase', fontWeight: 700, letterSpacing: '1px' }}
                  onChange={(e) => setId(e.target.value.toUpperCase())}
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                  Nombre de la Familia *
                </label>
                <input
                  className="field-input"
                  value={nombre}
                  placeholder="ej. Farmacia e Insumos Médicos"
                  onChange={(e) => setNombre(e.target.value)}
                />
              </div>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                Descripción o Ámbito de Aplicación
              </label>
              <input
                className="field-input"
                value={descripcion}
                placeholder="ej. Medicamentos y reactivos de atención clínica"
                onChange={(e) => setDescripcion(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setShowForm(false)}
                style={{ background: 'var(--input)', border: '1px solid var(--border)', color: 'var(--text)' }}
              >
                Cancelar
              </button>
              <button type="submit" className="btn btn-green btn-sm">
                💾 Guardar Familia
              </button>
            </div>
          </form>
        )}

        {/* Families List */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {familias.map((f) => {
            const count = productos.filter((p) => p.familia === f.id && p.estado === 'Activo').length;
            const prodsInFam = productos.filter((p) => p.familia === f.id);
            const codes = prodsInFam.map((p) => p.codigo).sort();
            const rangeStr =
              codes.length > 0 ? `${codes[0]} al ${codes[codes.length - 1]}` : 'Sin productos aún';

            return (
              <div
                key={f.id}
                style={{
                  background: '#0d1830',
                  border: '1px solid #1a2f58',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                  <span
                    style={{
                      background: f.id === 'ALI' ? '#06b6d4' : f.id === 'GOB' ? '#a855f7' : f.id === 'EQM' ? '#3b82f6' : '#eab308',
                      color: '#000',
                      fontWeight: 900,
                      fontSize: '13px',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      minWidth: '54px',
                      textAlign: 'center',
                      fontFamily: 'monospace',
                    }}
                  >
                    {f.id}
                  </span>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>
                        {f.nombre}
                      </span>
                      {f.esFija && (
                        <span
                          style={{
                            background: '#003366',
                            color: '#38bdf8',
                            fontSize: '9px',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                          }}
                        >
                          BASE OFICIAL
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '2px' }}>
                      {f.descripcion || 'Sin descripción'}
                    </div>
                    <div style={{ fontSize: '10.5px', color: '#38bdf8', marginTop: '3px' }}>
                      Códigos: <span style={{ fontFamily: 'monospace' }}>{rangeStr}</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#00e5ff' }}>
                      {count}
                    </div>
                    <div style={{ fontSize: '10px', color: '#64748b' }}>
                      productos activos
                    </div>
                  </div>
                  {!f.esFija && (
                    <button
                      onClick={() => onDeleteFamilia(f.id)}
                      className="btn btn-red btn-sm"
                      title={count > 0 ? `Hay ${count} productos en esta familia` : 'Eliminar familia'}
                      style={{ padding: '4px 8px', fontSize: '11px' }}
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div
          style={{
            marginTop: '16px',
            borderTop: '1px solid #1a2d54',
            paddingTop: '12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ fontSize: '11px', color: '#64748b' }}>
            ℹ️ Familias base establecidas: ALI (01-21), GOB (22-23), EQM (24-27), BOT (28-71)
          </div>
          <button className="btn btn-cyan btn-sm" onClick={onClose}>
            Entendido / Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

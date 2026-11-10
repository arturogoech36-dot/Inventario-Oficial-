import React, { useState } from 'react';

interface LoginScreenProps {
  onLogin: (nombre: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [nombre, setNombre] = useState('Arturo Gómez E.');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setError(true);
      return;
    }
    onLogin(nombre.trim());
  };

  return (
    <div
      id="loginScreen"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'var(--bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
    >
      <div
        style={{
          background: 'var(--panel)',
          border: '1px solid var(--border)',
          borderRadius: '14px',
          padding: '36px',
          width: '340px',
          textAlign: 'center',
          boxShadow: '0 8px 40px rgba(0, 0, 0, 0.6)',
        }}
      >
        <div style={{ fontSize: '32px', marginBottom: '8px' }}>🏥</div>
        <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--cyan)', marginBottom: '4px', letterSpacing: '0.4px', lineHeight: 1.25 }}>
          INVENTARIO OFICIAL BODEGA DE TRÁNSITO HAH
        </div>
        <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '22px', fontWeight: 600 }}>
          Hospital Alto Hospicio · HAH-CGI5
        </div>

        <form onSubmit={handleSubmit}>
          <input
            className="field-input"
            type="text"
            value={nombre}
            placeholder="Tu nombre"
            style={{ width: '100%', marginBottom: '14px', textAlign: 'center', height: '40px', fontSize: '13.5px' }}
            onChange={(e) => {
              setNombre(e.target.value);
              if (error) setError(false);
            }}
          />
          <button
            type="submit"
            className="btn btn-cyan btn-full"
            style={{ height: '40px', fontSize: '13.5px', fontWeight: 700 }}
          >
            🔐 Ingresar al Sistema
          </button>
        </form>

        {error && (
          <div style={{ color: 'var(--red)', fontSize: '11.5px', marginTop: '10px', fontWeight: 600 }}>
            ⚠️ Ingresa tu nombre
          </div>
        )}
        <div style={{ fontSize: '10.5px', color: 'var(--muted)', marginTop: '18px' }}>
          Sistema Oficial de Gestión de Inventario y Trazabilidad
        </div>
      </div>
    </div>
  );
};

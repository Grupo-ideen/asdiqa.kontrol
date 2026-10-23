'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/AppContext';
import { Services } from '@/lib/services';
import { Gasto } from '@/lib/types';

interface GastoFormProps {
  editingGasto: Gasto | null;
  onClose: () => void;
}

// Form state lives here, not in GastosView, so typing doesn't re-render the stats and the expense table.
export default function GastoForm({ editingGasto, onClose }: GastoFormProps) {
  const { brigadas, partidas, currentUser, refreshAll, showToast, currentObra } = useApp();

  const [formFecha, setFormFecha] = useState(editingGasto?.fecha ?? new Date().toISOString().split('T')[0]);
  const [formFechaFin, setFormFechaFin] = useState(editingGasto?.fecha_fin || '');
  const [formCategoria, setFormCategoria] = useState<'Material' | 'Trabajador' | 'Opcional' | 'Varios'>(editingGasto?.categoria ?? 'Material');
  const [formConcepto, setFormConcepto] = useState(editingGasto?.concepto ?? '');
  const [formImporte, setFormImporte] = useState(editingGasto?.importe ?? 0);
  const [formBrigadaId, setFormBrigadaId] = useState(editingGasto?.brigada_id ?? brigadas[0]?.id ?? '');
  const [formPartidaId, setFormPartidaId] = useState(editingGasto?.partida_id || '');
  const [formProveedor, setFormProveedor] = useState(editingGasto?.proveedor || '');
  const [formTipoCoste, setFormTipoCoste] = useState<'unico' | 'mensual' | 'diario'>(editingGasto?.tipo_coste || 'unico');

  const isReadOnly = currentUser?.rol === 'lector';
  // La fecha fin solo tiene sentido en gastos periódicos (mensual o diario).
  const soportaFechaFin = formTipoCoste === 'mensual' || formTipoCoste === 'diario';

  // Guardar Gasto (alta o edición)
  const handleSaveGasto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    if (!formBrigadaId || !formConcepto || formImporte <= 0 || !formFecha) {
      showToast('Por favor rellena todos los campos obligatorios y asegúrate de que el importe sea mayor que 0.', 'error');
      return;
    }
    // La fecha fin solo aplica a gastos periódicos y no puede ser anterior al inicio.
    const fechaFin = soportaFechaFin && formFechaFin ? formFechaFin : null;
    if (fechaFin && fechaFin < formFecha) {
      showToast('La fecha fin no puede ser anterior a la fecha de inicio.', 'error');
      return;
    }

    try {
      const gastoData: Gasto = {
        id: editingGasto?.id || `g-temp`,
        fecha: formFecha,
        fecha_fin: fechaFin,
        categoria: formCategoria,
        concepto: formConcepto,
        importe: Number(formImporte),
        tipo_coste: formTipoCoste,
        brigada_id: formBrigadaId,
        partida_id: formPartidaId || null,
        proveedor: formProveedor || null,
        creado_por: editingGasto?.creado_por || currentUser?.id || null,
        obra_id: currentObra?.id || ''
      };

      await Services.saveGasto(gastoData);
      onClose();
      await refreshAll();
      showToast(editingGasto ? 'Gasto actualizado con éxito.' : 'Gasto registrado con éxito.', 'success');
    } catch (err) {
      console.error(err);
      showToast('Error al guardar el gasto.', 'error');
    }
  };

  return (
    <form onSubmit={handleSaveGasto} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
      <div>
        <label htmlFor="form-fecha">{soportaFechaFin ? 'Fecha de inicio:' : 'Fecha del Gasto:'}</label>
        <input
          type="date"
          id="form-fecha"
          value={formFecha}
          onChange={e => setFormFecha(e.target.value)}
          required
        />
      </div>

      {soportaFechaFin && (
        <div>
          <label htmlFor="form-fecha-fin">Fecha de fin (opcional):</label>
          <input
            type="date"
            id="form-fecha-fin"
            value={formFechaFin}
            min={formFecha}
            onChange={e => setFormFechaFin(e.target.value)}
            aria-describedby="form-fecha-fin-help"
          />
          <span id="form-fecha-fin-help" style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
            Déjala vacía si el gasto sigue en curso. {formTipoCoste === 'mensual' ? 'El importe mensual se prorratea por los días naturales activos.' : 'El coste diario solo se imputa dentro de este intervalo.'}
          </span>
        </div>
      )}

      <div>
        <label htmlFor="form-categoria">Categoría:</label>
        <select
          id="form-categoria"
          value={formCategoria}
          onChange={e => setFormCategoria(e.target.value as 'Material' | 'Trabajador' | 'Opcional' | 'Varios')}
          required
        >
          <option value="Material">Material</option>
          <option value="Trabajador">Trabajador (Mano de obra)</option>
          <option value="Opcional">Opcional (Extra/Otros)</option>
          <option value="Varios">Varios (Maquinaria/Transporte)</option>
        </select>
      </div>

      <div>
        <label htmlFor="form-concepto">Concepto (Descripción libre):</label>
        <input
          type="text"
          id="form-concepto"
          value={formConcepto}
          onChange={e => setFormConcepto(e.target.value)}
          placeholder="Ej. Alquiler retroexcavadora, Tubo PVC"
          required
        />
      </div>

      <div>
        <label htmlFor="form-importe">Importe Coste (€):</label>
        <input
          type="number"
          id="form-importe"
          value={formImporte || ''}
          onChange={e => setFormImporte(Number(e.target.value))}
          min="0.01"
          step="0.01"
          required
        />
      </div>

      <div>
        <label htmlFor="form-tipo-coste">Periodicidad del Gasto / Tipo de Coste:</label>
        <select
          id="form-tipo-coste"
          value={formTipoCoste}
          onChange={e => setFormTipoCoste(e.target.value as 'unico' | 'mensual' | 'diario')}
          required
        >
          <option value="unico">Gasto Único (Imputado en la fecha del registro)</option>
          <option value="mensual">Gasto Mensual (Prorrateado por días naturales activos)</option>
          <option value="diario">Gasto Diario (Coste fijo por cada día de trabajo)</option>
        </select>
      </div>

      <div>
        <label htmlFor="form-brigada">Brigada Imputada:</label>
        <select
          id="form-brigada"
          value={formBrigadaId}
          onChange={e => setFormBrigadaId(e.target.value)}
          required
        >
          <option value="">Selecciona brigada...</option>
          {brigadas.map(b => (
            <option key={b.id} value={b.id}>
              {b.nombre}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="form-partida">Código de Partida asociado (Opcional):</label>
        <select
          id="form-partida"
          value={formPartidaId}
          onChange={e => setFormPartidaId(e.target.value)}
        >
          <option value="">No asociado a partida específica</option>
          {partidas.map(p => (
            <option key={p.id} value={p.id}>
              {p.codigo} - {p.descripcion.substring(0, 30)}...
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="form-proveedor">Proveedor / Trazabilidad (Opcional):</label>
        <input
          type="text"
          id="form-proveedor"
          value={formProveedor}
          onChange={e => setFormProveedor(e.target.value)}
          placeholder="Ej. Suministros Martínez S.A."
        />
      </div>

      <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '0.5rem', marginTop: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
        <button type="submit" className="primary">
          {editingGasto ? 'Actualizar Gasto' : 'Guardar Gasto'}
        </button>
        <button type="button" onClick={onClose}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/AppContext';
import { Services } from '@/lib/services';
import { ParteTrabajo, ParteLinea } from '@/lib/types';
import { formatPuntos } from '@/lib/format';

type DesgloseItem = { descripcion: string; cantidad: number };
type FormLinea = Omit<ParteLinea, 'id' | 'parte_id'> & { desgloseItems?: DesgloseItem[] };

interface ParteFormProps {
  editingParte: ParteTrabajo | null;
  onClose: () => void;
}

const today = () => new Date().toISOString().split('T')[0];

function toFormLineas(parte: ParteTrabajo): FormLinea[] {
  return parte.lineas?.map(l => {
    let items: DesgloseItem[] = [];
    if (l.desglose) {
      try {
        items = JSON.parse(l.desglose);
      } catch (e) {
        console.error('Error parsing desglose JSON:', e);
      }
    }
    return {
      partida_id: l.partida_id,
      metros_ejecutados: l.metros_ejecutados,
      desgloseItems: items
    };
  }) || [{ partida_id: '', metros_ejecutados: 0, desgloseItems: [] }];
}

// Form state lives here, not in PartesView, so typing doesn't re-render the whole parte history.
export default function ParteForm({ editingParte, onClose }: ParteFormProps) {
  const { brigadas, partidas, currentUser, refreshAll, showToast, currentObra } = useApp();

  const [formFecha, setFormFecha] = useState(editingParte?.fecha ?? today());
  const [formBrigadaId, setFormBrigadaId] = useState(editingParte?.brigada_id ?? brigadas[0]?.id ?? '');
  const [formNumPersonas, setFormNumPersonas] = useState(editingParte?.num_personas ?? brigadas[0]?.num_personas_habitual ?? 1);
  const [formObservaciones, setFormObservaciones] = useState(editingParte?.observaciones || '');
  const [formLineas, setFormLineas] = useState<FormLinea[]>(() =>
    editingParte
      ? toFormLineas(editingParte)
      : [{ partida_id: partidas[0]?.id || '', metros_ejecutados: 0, desgloseItems: [] }]
  );

  const isReadOnly = currentUser?.rol === 'lector';
  const isAdmin = currentUser?.rol === 'admin';

  const handleBrigadaChange = (id: string) => {
    setFormBrigadaId(id);
    if (!editingParte) {
      const selected = brigadas.find(b => b.id === id);
      if (selected) {
        setFormNumPersonas(selected.num_personas_habitual);
      }
    }
  };

  // Manejo de líneas en el formulario
  const handleAddLinea = () => {
    setFormLineas([...formLineas, { partida_id: '', metros_ejecutados: 0, desgloseItems: [] }]);
  };

  const handleRemoveLinea = (index: number) => {
    if (formLineas.length > 1) {
      setFormLineas(formLineas.filter((_, i) => i !== index));
    }
  };

  const handleLineaChange = (index: number, field: 'partida_id' | 'metros_ejecutados', value: string | number) => {
    const updated = [...formLineas];
    if (field === 'metros_ejecutados') {
      updated[index].metros_ejecutados = Number(value) || 0;
    } else {
      updated[index].partida_id = value as string;
    }
    setFormLineas(updated);
  };

  const handleAddDesgloseItem = (lineaIndex: number) => {
    const updated = [...formLineas];
    const items = updated[lineaIndex].desgloseItems || [];
    updated[lineaIndex].desgloseItems = [...items, { descripcion: '', cantidad: 0 }];
    setFormLineas(updated);
  };

  const handleRemoveDesgloseItem = (lineaIndex: number, itemIndex: number) => {
    const updated = [...formLineas];
    const items = updated[lineaIndex].desgloseItems || [];
    const newItems = items.filter((_, i) => i !== itemIndex);
    updated[lineaIndex].desgloseItems = newItems;

    // Recalcular metros_ejecutados automáticamente
    const totalQty = newItems.reduce((sum, item) => sum + (item.cantidad || 0), 0);
    updated[lineaIndex].metros_ejecutados = totalQty;

    setFormLineas(updated);
  };

  const handleDesgloseChange = (
    lineaIndex: number,
    itemIndex: number,
    field: 'descripcion' | 'cantidad',
    value: string
  ) => {
    const updated = [...formLineas];
    const items = [...(updated[lineaIndex].desgloseItems || [])];
    if (field === 'cantidad') {
      items[itemIndex].cantidad = Number(value) || 0;
    } else {
      items[itemIndex].descripcion = value;
    }
    updated[lineaIndex].desgloseItems = items;

    // Recalcular metros_ejecutados automáticamente
    const totalQty = items.reduce((sum, item) => sum + (item.cantidad || 0), 0);
    updated[lineaIndex].metros_ejecutados = totalQty;

    setFormLineas(updated);
  };

  // Guardar Parte
  const handleSaveParte = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    if (!formBrigadaId || !formFecha) {
      showToast('Por favor selecciona una brigada y fecha válidas.', 'error');
      return;
    }

    // Filtrar líneas vacías y mapear desglose
    const validLineas = formLineas
      .filter(l => l.partida_id && l.metros_ejecutados > 0)
      .map(l => {
        const payload: Omit<ParteLinea, 'id' | 'parte_id'> = {
          partida_id: l.partida_id,
          metros_ejecutados: l.metros_ejecutados
        };
        if (currentObra?.tipo === 'tarea' && l.desgloseItems && l.desgloseItems.length > 0) {
          payload.desglose = JSON.stringify(l.desgloseItems);
        }
        return payload;
      });

    if (validLineas.length === 0) {
      showToast('Debes agregar al menos una línea de trabajo con cantidad superior a 0.', 'error');
      return;
    }

    try {
      const parteData: ParteTrabajo = {
        id: editingParte?.id || `pt-temp`,
        fecha: formFecha,
        brigada_id: formBrigadaId,
        num_personas: Number(formNumPersonas),
        creado_por: currentUser?.id || null,
        observaciones: formObservaciones,
        obra_id: currentObra?.id || ''
      };

      await Services.saveParteTrabajo(parteData, validLineas);
      onClose();
      await refreshAll();
      showToast(editingParte ? 'Parte de trabajo corregido correctamente.' : 'Parte de trabajo registrado correctamente.', 'success');
    } catch (err) {
      console.error(err);
      showToast('Error al guardar el parte de trabajo.', 'error');
    }
  };

  return (
    <form onSubmit={handleSaveParte} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Cabecera del Parte */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div>
          <label htmlFor="form-fecha">Fecha del Parte:</label>
          <input
            type="date"
            id="form-fecha"
            value={formFecha}
            onChange={e => setFormFecha(e.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="form-brigada">Brigada / Equipo:</label>
          <select
            id="form-brigada"
            value={formBrigadaId}
            onChange={e => handleBrigadaChange(e.target.value)}
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
          <label htmlFor="form-personas">Operarios ese día:</label>
          <input
            type="number"
            id="form-personas"
            value={formNumPersonas}
            onChange={e => setFormNumPersonas(Number(e.target.value))}
            min="1"
            required
          />
        </div>
      </div>

      {/* Líneas de ejecución (Partidas y Metros) */}
      <div>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {currentObra?.tipo === 'tarea' ? 'Líneas de Trabajo (Tareas y Cantidades realizadas)' : 'Líneas de Producción (Metros o unidades ejecutadas)'}
        </h3>
              
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {formLineas.map((linea, index) => (
            <div key={index} style={{ 
              borderBottom: '1px solid var(--border-color)', 
              paddingBottom: '0.75rem', 
              marginBottom: '0.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem'
            }}>
              <div className="linea-form-row" style={{ marginBottom: 0 }}>
                <div className="linea-field-select">
                  <label htmlFor={`partida-${index}`} style={{ display: 'none' }}>Partida</label>
                  <select
                    id={`partida-${index}`}
                    value={linea.partida_id}
                    onChange={e => handleLineaChange(index, 'partida_id', e.target.value)}
                    required
                  >
                    <option value="">{currentObra?.tipo === 'tarea' ? 'Selecciona tarea...' : 'Selecciona partida de presupuesto...'}</option>
                    {partidas.map(p => (
                      <option key={p.id} value={p.id}>
                        [{p.codigo}] {p.descripcion} ({currentObra?.tipo === 'tarea' ? `${formatPuntos(Number(p.puntos || p.precio_unitario))} pts` : `${isAdmin ? `${p.precio_unitario}€/${p.unidad}` : p.unidad}`})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="linea-field-qty">
                  <label htmlFor={`metros-${index}`} style={{ display: 'none' }}>Cantidad ejecutada</label>
                  <input
                    type="number"
                    id={`metros-${index}`}
                    placeholder={currentObra?.tipo === 'tarea' ? "5" : "120"}
                    value={linea.metros_ejecutados || ''}
                    onChange={e => handleLineaChange(index, 'metros_ejecutados', e.target.value)}
                    min="0.001"
                    step="any"
                    required
                    readOnly={currentObra?.tipo === 'tarea' && !!linea.desgloseItems && linea.desgloseItems.length > 0}
                    style={{ 
                      flex: 1, 
                      backgroundColor: (currentObra?.tipo === 'tarea' && !!linea.desgloseItems && linea.desgloseItems.length > 0) ? 'var(--bg-tertiary)' : 'inherit' 
                    }}
                    title={(currentObra?.tipo === 'tarea' && !!linea.desgloseItems && linea.desgloseItems.length > 0) ? "Calculado automáticamente como la suma del desglose" : undefined}
                  />
                  {currentObra?.tipo !== 'tarea' && (
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {partidas.find(p => p.id === linea.partida_id)?.unidad || 'm'}
                    </span>
                  )}
                </div>

                {formLineas.length > 1 && (
                  <button
                    type="button"
                    className="danger linea-btn-delete"
                    onClick={() => handleRemoveLinea(index)}
                    aria-label="Quitar línea"
                  >
                    ✕
                  </button>
                )}
              </div>

              {currentObra?.tipo === 'tarea' && (
                <div style={{ 
                  marginLeft: '1rem', 
                  padding: '0.5rem 0.75rem', 
                  borderRadius: 'var(--border-radius)', 
                  backgroundColor: 'var(--bg-tertiary)', 
                  border: '1px solid var(--border-color)',
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '0.5rem' 
                }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Desglose de Tarea
                  </div>
                        
                  {(linea.desgloseItems || []).map((item, itemIndex) => (
                    <div key={itemIndex} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input
                        type="text"
                        placeholder="Ej: Cable de 1,5"
                        value={item.descripcion}
                        onChange={e => handleDesgloseChange(index, itemIndex, 'descripcion', e.target.value)}
                        style={{ flex: 3, padding: '0.35rem 0.5rem', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)' }}
                        required
                      />
                      <input
                        type="number"
                        placeholder="Cant."
                        value={item.cantidad || ''}
                        onChange={e => handleDesgloseChange(index, itemIndex, 'cantidad', e.target.value)}
                        style={{ flex: 1, padding: '0.35rem 0.5rem', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)' }}
                        min="0.001"
                        step="any"
                        required
                      />
                      <button
                        type="button"
                        className="danger"
                        onClick={() => handleRemoveDesgloseItem(index, itemIndex)}
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderRadius: '4px' }}
                        aria-label="Quitar desglose"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                        
                  <button
                    type="button"
                    onClick={() => handleAddDesgloseItem(index)}
                    style={{ 
                      alignSelf: 'flex-start', 
                      fontSize: '0.7rem', 
                      padding: '0.25rem 0.5rem', 
                      background: 'none', 
                      border: '1px dashed var(--border-color)', 
                      color: 'var(--text-secondary)',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    + Añadir fila de desglose
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={handleAddLinea}
          style={{ marginTop: '0.75rem', fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
        >
          {currentObra?.tipo === 'tarea' ? '+ Añadir Tarea Realizada' : '+ Añadir Partida Trabajada'}
        </button>
      </div>

      {/* Observaciones */}
      <div>
        <label htmlFor="form-obs">Observaciones o Incidencias (Climatología, averías, etc.):</label>
        <textarea
          id="form-obs"
          rows={2}
          value={formObservaciones}
          onChange={e => setFormObservaciones(e.target.value)}
          placeholder="Indica si hubo incidencias"
        />
      </div>

      {/* Acciones del Formulario */}
      <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
        <button type="submit" className="primary">
          {editingParte ? 'Actualizar Parte Diario' : 'Confirmar y Guardar'}
        </button>
        <button type="button" onClick={onClose}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

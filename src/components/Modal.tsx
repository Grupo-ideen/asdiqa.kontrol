'use client';

import React, { useEffect, useId, useRef } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  // 'md' fits single-column forms; 'lg' fits multi-column ones.
  size?: 'md' | 'lg';
  children: React.ReactNode;
}

// Built on the native <dialog> so focus trapping, Escape to close and an inert background come for free.
export default function Modal({ isOpen, onClose, title, size = 'lg', children }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pointerDownOnBackdrop = useRef(false);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  // Only close when the press both starts and ends on the backdrop, so dragging a text selection out of an input doesn't dismiss the form.
  const handlePointerDown = (e: React.PointerEvent<HTMLDialogElement>) => {
    pointerDownOnBackdrop.current = e.target === e.currentTarget;
  };

  const handleClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (pointerDownOnBackdrop.current && e.target === e.currentTarget) {
      onClose();
    }
    pointerDownOnBackdrop.current = false;
  };

  return (
    <dialog
      ref={dialogRef}
      className={`modal modal--${size}`}
      aria-labelledby={titleId}
      onClose={onClose}
      onPointerDown={handlePointerDown}
      onClick={handleClick}
    >
      <div className="modal-content">
        <div className="modal-header">
          <h2 id={titleId} className="modal-title">{title}</h2>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Cerrar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="modal-body">
          {isOpen && children}
        </div>
      </div>
    </dialog>
  );
}

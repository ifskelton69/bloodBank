import { X } from "lucide-react";

export default function Modal({ title, onClose, children }) {
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section className="modal">
        <header>
          <div>
            <h2>{title}</h2>
            <p>Enter the details below to update your network.</p>
          </div>
          <button className="icon-btn" onClick={onClose}>
            <X size={19} />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

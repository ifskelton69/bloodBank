export default function Button({ children, onClick, variant = "primary", icon: Icon, type = "button" }) {
  return (
    <button type={type} className={`btn ${variant}`} onClick={onClick}>
      {Icon && <Icon size={16} />} {children}
    </button>
  );
}

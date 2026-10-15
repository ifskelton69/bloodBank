import { useState } from "react";
import { AlertCircle, ArrowRight, Droplet, Lock, Mail, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/useAuth";
import Button from "../components/common/Button";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setSubmitting(true);
    try {
      await login(cleanEmail, password);
    } catch (err) {
      const msg = err.response?.data?.error || "Login failed. Please verify your credentials or server connection.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-brand">
          <div className="brand-mark login-logo">
            <Droplet size={32} fill="currentColor" />
          </div>
          <div className="login-title-group">
            <h2>VitalDrop</h2>
            <span>BLOOD BANK NETWORK</span>
          </div>
        </div>

        <div className="login-header">
          <h3>Administrator Sign In</h3>
          <p>Access the central blood bank management portal and verify requests.</p>
        </div>

        {error && (
          <div className="login-error-alert" role="alert">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="admin-email">Admin Email Address</label>
            <div className="input-with-icon">
              <Mail size={18} className="input-icon" />
              <input
                id="admin-email"
                type="email"
                required
                autoComplete="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={submitting}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="admin-password">Password</label>
            <div className="input-with-icon">
              <Lock size={18} className="input-icon" />
              <input
                id="admin-password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full login-btn"
            disabled={submitting}
            icon={submitting ? null : ArrowRight}
          >
            {submitting ? "Authenticating..." : "Sign in to Dashboard"}
          </Button>
        </form>

        <div className="login-footer-info">
          <ShieldCheck size={16} />
          <span>Restricted portal for authorized blood bank administrators only.</span>
        </div>
      </div>
    </div>
  );
}

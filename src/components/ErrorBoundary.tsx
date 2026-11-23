import React, { Component } from "react";
import type { CSSProperties, ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Without this, any render error unmounts the whole tree and the user sees a blank white screen.
 * Shows the message and lets them recover (reload) or clear possibly-corrupt saved UI state.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };
  props: Props;

  constructor(props: Props) {
    super(props);
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("UI crashed:", error, info.componentStack);
  }

  private resetSavedUiState = () => {
    try {
      // Keep API provider settings; drop UI/chat state that may hold the bad data.
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith("sas_") || (key.startsWith("script_automation_") && !key.includes("provider_config"))) {
          localStorage.removeItem(key);
        }
      }
    } catch {
      // storage unavailable
    }
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div
        role="alert"
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          background: "#141414",
          color: "#f5f5f5",
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        <div style={{ maxWidth: 560 }}>
          <h1 style={{ fontSize: 22, marginBottom: 8 }}>Something went wrong</h1>
          <p style={{ opacity: 0.8, marginBottom: 12 }}>
            The screen crashed while drawing. Your scripts on disk are not affected.
          </p>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              fontSize: 12,
              padding: 12,
              borderRadius: 8,
              background: "#222",
              marginBottom: 16,
              maxHeight: 200,
              overflow: "auto",
            }}
          >
            {this.state.error.message}
          </pre>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => window.location.reload()} style={btn("#FF073A")}>
              Reload
            </button>
            <button onClick={this.resetSavedUiState} style={btn("#444")}>
              Reset saved UI data &amp; reload
            </button>
          </div>
        </div>
      </div>
    );
  }
}

const btn = (bg: string): CSSProperties => ({
  background: bg,
  color: "#fff",
  border: 0,
  borderRadius: 8,
  padding: "10px 16px",
  fontWeight: 700,
  cursor: "pointer",
});

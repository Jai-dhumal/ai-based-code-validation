import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

class RootErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('RootErrorBoundary caught error:', error, errorInfo);
  }

  handleReset = () => {
    try {
      localStorage.removeItem('ai_validate_user');
      localStorage.removeItem('ai_validate_token');
      localStorage.setItem('ai_validate_theme', 'light');
    } catch (e) {}
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 text-slate-800 flex items-center justify-center p-6 font-['Plus_Jakarta_Sans',sans-serif]">
          <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-slate-200 shadow-xl text-center space-y-4">
            <div className="w-14 h-14 bg-indigo-50 border border-indigo-200 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto text-2xl font-bold shadow-sm">
              ✨
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                AI Code Validator 2.0
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                JSPM BSIOTR Academic Portal
              </p>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-left">
              <p className="text-xs font-bold text-slate-700 mb-1">Session Status</p>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                A browser session synchronization issue occurred. Click below to refresh your session and return to the portal.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition"
              >
                Clear Cache &amp; Sign In
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="py-3 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition"
              >
                Reload
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </React.StrictMode>
);

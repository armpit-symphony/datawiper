import React from 'react';
import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';

const Admin = () => {
  const [version, setVersion] = React.useState('');
  const [jsonInput, setJsonInput] = React.useState('');
  const [status, setStatus] = React.useState(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const backendBase = process.env.REACT_APP_BACKEND_URL;
  const adminToken = process.env.REACT_APP_ADMIN_TOKEN;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus(null);

    if (!backendBase) {
      setStatus({ type: 'error', message: 'Backend URL is not configured.' });
      return;
    }

    if (!adminToken) {
      setStatus({ type: 'error', message: 'Admin token is not configured.' });
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonInput);
    } catch (error) {
      setStatus({ type: 'error', message: 'Invalid JSON. Please paste a valid broker pack.' });
      return;
    }

    const versionValue = version.trim();
    const parsedVersion = typeof parsed.version === 'string' ? parsed.version : '';

    if (!versionValue && !parsedVersion) {
      setStatus({ type: 'error', message: 'Provide a version in the form or inside the JSON.' });
      return;
    }

    if (versionValue && parsedVersion && versionValue !== parsedVersion) {
      setStatus({ type: 'error', message: 'Version mismatch between the form and JSON.' });
      return;
    }

    const finalVersion = versionValue || parsedVersion;

    if (!Array.isArray(parsed.brokers)) {
      setStatus({ type: 'error', message: 'Broker pack JSON must include a brokers array.' });
      return;
    }

    const payload = {
      ...parsed,
      version: finalVersion
    };

    setIsSubmitting(true);

    try {
      const response = await fetch(`${backendBase}/api/broker-packs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setStatus({ type: 'error', message: data?.detail || 'Failed to publish broker pack.' });
      } else {
        setStatus({ type: 'success', message: `Broker pack ${data.version} published successfully.` });
      }
    } catch (error) {
      setStatus({ type: 'error', message: 'Network error publishing broker pack.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary-950 via-secondary-900 to-primary-950">
      <div className="container-custom section-padding">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-8 h-8 text-primary-400" />
            <span className="text-2xl font-bold gradient-text">DataWipe Admin</span>
          </div>

          <p className="text-secondary-300 text-lg mb-8">
            Publish new broker pack versions. This page is admin-only and uses the bearer token configured in your
            frontend environment.
          </p>

          <div className="glass-morphism rounded-2xl p-6 space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="version" className="block text-sm font-medium text-secondary-300 mb-2">
                  Pack version (semantic)
                </label>
                <input
                  id="version"
                  type="text"
                  value={version}
                  onChange={(event) => setVersion(event.target.value)}
                  placeholder="1.0.1"
                  className="w-full px-4 py-3 bg-secondary-800/50 border border-secondary-600 rounded-xl text-white placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label htmlFor="packJson" className="block text-sm font-medium text-secondary-300 mb-2">
                  Broker pack JSON
                </label>
                <textarea
                  id="packJson"
                  rows={10}
                  value={jsonInput}
                  onChange={(event) => setJsonInput(event.target.value)}
                  placeholder='{"version": "1.0.1", "brokers": [ ... ]}'
                  className="w-full px-4 py-3 bg-secondary-800/50 border border-secondary-600 rounded-xl text-white placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <p className="text-xs text-secondary-500 mt-2">
                  Required fields: version, brokers[], each broker must include id, name, opt_out_url.
                </p>
              </div>

              {status ? (
                <div
                  className={`rounded-xl border px-4 py-3 text-sm ${
                    status.type === 'error'
                      ? 'border-red-400/50 text-red-200 bg-red-500/10'
                      : 'border-emerald-400/50 text-emerald-200 bg-emerald-500/10'
                  }`}
                  role="status"
                  aria-live="polite"
                >
                  {status.message}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Publishing…' : 'Publish broker pack'}
              </button>
            </form>
          </div>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link to="/" className="btn-secondary">
              Back to workspace
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;

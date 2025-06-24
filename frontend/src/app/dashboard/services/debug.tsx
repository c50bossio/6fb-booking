"use client";

import { useEffect, useState } from "react";

export default function ServicesDebug() {
  const [authStatus, setAuthStatus] = useState<any>({});
  const [apiHealth, setApiHealth] = useState<any>({});
  const [error, setError] = useState<string>("");

  useEffect(() => {
    // Check auth status
    const token = localStorage.getItem("access_token");
    const user = localStorage.getItem("user");

    setAuthStatus({
      hasToken: !!token,
      hasUser: !!user,
      tokenPreview: token ? `${token.substring(0, 20)}...` : "No token",
      user: user ? JSON.parse(user) : null
    });

    // Check API health
    fetch("http://localhost:8003/api/v1/health")
      .then(res => res.json())
      .then(data => setApiHealth(data))
      .catch(err => setError(`Health check failed: ${err.message}`));

    // Test services endpoint
    fetch("http://localhost:8003/api/v1/services/categories", {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    })
      .then(res => {
        if (!res.ok) {
          throw new Error(`Services API returned ${res.status}: ${res.statusText}`);
        }
        return res.json();
      })
      .then(data => {
        console.log("Services categories response:", data);
      })
      .catch(err => {
        console.error("Services API error:", err);
        setError(prev => prev + "\n" + `Services API error: ${err.message}`);
      });
  }, []);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Services Page Debug</h1>

      <div className="bg-white p-4 rounded-lg border">
        <h2 className="font-semibold mb-2">Auth Status</h2>
        <pre className="text-sm">{JSON.stringify(authStatus, null, 2)}</pre>
      </div>

      <div className="bg-white p-4 rounded-lg border">
        <h2 className="font-semibold mb-2">API Health</h2>
        <pre className="text-sm">{JSON.stringify(apiHealth, null, 2)}</pre>
      </div>

      {error && (
        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <h2 className="font-semibold mb-2 text-red-800">Errors</h2>
          <pre className="text-sm text-red-600 whitespace-pre-wrap">{error}</pre>
        </div>
      )}

      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h2 className="font-semibold mb-2 text-blue-800">Next Steps</h2>
        <ul className="list-disc list-inside text-sm space-y-1">
          <li>Check browser console for additional errors</li>
          <li>Verify backend is running on port 8003</li>
          <li>Check network tab for failed requests</li>
          <li>Ensure CORS is properly configured</li>
        </ul>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { captureKeyFromFragment, getAccount, tokenStore } from "./lib/api";
import { Spinner } from "./components/ui";
import Layout from "./components/Layout";
import LandingPage from "./pages/LandingPage";
import AppsPage from "./pages/AppsPage";
import AppPage from "./pages/AppPage";
import KeysPage from "./pages/KeysPage";

export default function App() {
  // boot: resolving fragment key + validating token · landing: unauthenticated
  const [state, setState] = useState<"boot" | "landing" | "ok">("boot");

  useEffect(() => {
    captureKeyFromFragment();
    if (!tokenStore.token) {
      setState("landing");
      return;
    }
    getAccount()
      .then(() => setState("ok"))
      .catch(() => setState("ok")); // 401 already redirects to /auth/dashboard
  }, []);

  if (state === "boot") return <Spinner />;
  if (state === "landing") return <LandingPage />;

  return (
    <BrowserRouter basename="/dashboard/">
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<AppsPage />} />
          <Route path="/apps/:name" element={<AppPage />} />
          <Route path="/keys" element={<KeysPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

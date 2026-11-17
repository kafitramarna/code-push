import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { captureKeyFromFragment, getAccount, tokenStore, login } from "./lib/api";
import { Spinner } from "./components/ui";
import Layout from "./components/Layout";
import AppsPage from "./pages/AppsPage";
import AppPage from "./pages/AppPage";
import KeysPage from "./pages/KeysPage";

export default function App() {
  const [state, setState] = useState<"boot" | "ok">("boot");

  useEffect(() => {
    captureKeyFromFragment();
    if (!tokenStore.token) {
      login();
      return;
    }
    getAccount()
      .then(() => setState("ok"))
      .catch(() => setState("ok")); // 401 already redirects; other errors render anyway
  }, []);

  if (state === "boot") return <Spinner />;

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

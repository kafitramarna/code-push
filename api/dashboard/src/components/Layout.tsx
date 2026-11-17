import { NavLink, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { getAccount, logout, type Account } from "../lib/api";

export default function Layout() {
  const [account, setAccount] = useState<Account | null>(null);

  useEffect(() => {
    getAccount().then(setAccount).catch(() => {});
  }, []);

  return (
    <>
      <nav className="topnav">
        <div className="brand">
          CodePush<span>·</span>VenusVerse
        </div>
        <NavLink to="/" end>
          Apps
        </NavLink>
        <NavLink to="/keys">Access keys</NavLink>
        <div className="spacer" />
        <span className="user">{account?.email ?? ""}</span>
        <button className="btn sm" onClick={logout}>
          Sign out
        </button>
      </nav>
      <main className="page">
        <Outlet />
      </main>
    </>
  );
}

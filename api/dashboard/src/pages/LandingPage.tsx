import { login } from "../lib/api";

export default function LandingPage() {
  return (
    <div className="landing">
      <section className="landing-hero">
        <div className="landing-eyebrow">VenusVerse CodePush</div>
        <h1>
          Ship mobile updates
          <br />
          <em>without the app store</em>.
        </h1>
        <p className="lede">
          Over-the-air updates for your React Native and Cordova apps — releases, staged rollouts, and instant
          rollbacks, managed from one dashboard and secured by VenusVerse SSO.
        </p>
        <div className="landing-cta">
          <button className="btn primary" style={{ padding: "10px 22px", fontSize: 14 }} onClick={login}>
            Sign in with SSO →
          </button>
        </div>
        <div className="landing-foot">
          Prefer the terminal? <code>code-push-standalone login</code> works too.
        </div>
      </section>

      <aside className="landing-side">
        <div className="landing-card">
          <div className="k">deployments</div>
          <div className="t">Staging → Production</div>
          <div className="d">Separate deployment keys per environment, promote a release when it proves itself.</div>
        </div>
        <div className="landing-card">
          <div className="k">rollout</div>
          <div className="t">Gradual exposure</div>
          <div className="d">Ship to 10% of devices first, watch the metrics, then take it to 100% — or pull it back.</div>
        </div>
        <div className="landing-card">
          <div className="k">metrics</div>
          <div className="t">Know who got what</div>
          <div className="d">Active installs, downloads and failures per release, straight from the devices.</div>
        </div>
      </aside>
    </div>
  );
}

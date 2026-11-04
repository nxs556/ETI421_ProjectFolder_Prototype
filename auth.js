"use strict";
// AWS Cognito OAuth authorization-code login with PKCE.
// This controls the dashboard UI, not access to public Github Pages source files.
(() => {
  const config = window.AEROTRACK_CONFIG;
  const by_id = (id) => document.getElementById(id);
  const configured = () =>
    Boolean(
      config.cognito_domain && config.cognito_client_id && config.redirect_uri,
    );
  const endpoint = (name) =>
    `${config.cognito_domain.replace(/\/$/, "")}/${name}`;
  const base64url = (bytes) =>
    btoa(String.fromCharCode(...bytes))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  const fresh_random = (size) =>
    base64url(crypto.getRandomValues(new Uint8Array(size)));
  let access_token = null;
  let expiry = 0;

  async function sign_in() {
    if (!configured()) return;
    const verifier = fresh_random(48);
    const hash = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(verifier),
    );
    const challenge = base64url(new Uint8Array(hash));
    const state = fresh_random(24);
    sessionStorage.setItem("aero_pkce_verifier", verifier);
    sessionStorage.setItem("aero_login_state", state);
    sessionStorage.setItem(
      "aero_return_path",
      location.pathname.split("/").pop() === "forecast.html"
        ? "forecast.html"
        : "index.html",
    );
    const url = new URL(endpoint("oauth2/authorize"));
    Object.entries({
      response_type: "code",
      client_id: config.cognito_client_id,
      redirect_uri: config.redirect_uri,
      scope: "openid email",
      state,
      code_challenge_method: "S256",
      code_challenge: challenge,
    }).forEach(([key, value]) => url.searchParams.set(key, value));
    location.assign(url.toString());
  }

  async function finish_sign_in() {
    const params = new URLSearchParams(location.search);
    if (params.has("error"))
      throw new Error(params.get("error_description") || params.get("error"));
    if (!params.has("code")) return;
    const saved_state = sessionStorage.getItem("aero_login_state");
    const verifier = sessionStorage.getItem("aero_pkce_verifier");
    if (!saved_state || params.get("state") !== saved_state || !verifier)
      throw new Error("Invalid login state. Please sign in again.");
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: config.cognito_client_id,
      code: params.get("code"),
      redirect_uri: config.redirect_uri,
      code_verifier: verifier,
    });
    const response = await fetch(endpoint("oauth2/token"), {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!response.ok)
      throw new Error(
        "Login token exchange failed. Check Cognito callback settings and CORS.",
      );
    const token_data = await response.json();
    if (!token_data.access_token)
      throw new Error("Login did not return an access token.");
    sessionStorage.setItem("aero_token", token_data.access_token);
    sessionStorage.setItem(
      "aero_expires",
      String(Date.now() + token_data.expires_in * 1000),
    );
    sessionStorage.removeItem("aero_login_state");
    sessionStorage.removeItem("aero_pkce_verifier");
    history.replaceState({}, "", location.pathname);
    const return_path = sessionStorage.getItem("aero_return_path");
    sessionStorage.removeItem("aero_return_path");
    if (
      return_path === "forecast.html" &&
      !location.pathname.endsWith("forecast.html")
    )
      location.assign("forecast.html");
  }

  function sign_out() {
    sessionStorage.removeItem("aero_token");
    sessionStorage.removeItem("aero_expires");
    sessionStorage.removeItem("aero_return_path");
    access_token = null;
    expiry = 0;
    // Cognito logout also ends its managed-login browser session.
    if (!configured()) {
      location.assign("index.html");
      return;
    }
    const url = new URL(endpoint("logout"));
    url.searchParams.set("client_id", config.cognito_client_id);
    url.searchParams.set("logout_uri", config.redirect_uri);
    location.assign(url.toString());
  }

  async function init_auth() {
    const status = by_id("auth_status"),
      login = by_id("login_button"),
      logout = by_id("logout_button"),
      content = by_id("app_content"),
      notice = by_id("auth_notice");
    login?.addEventListener("click", sign_in);
    logout?.addEventListener("click", sign_out);
    if (!config.require_auth) {
      if (status) status.textContent = "Preview mode";
      if (content) content.classList.remove("hidden");
      if (notice) {
        notice.textContent =
          "Preview mode: sign in is not enabled. Configure Cognito before publishing protected API access.";
        notice.classList.remove("hidden");
      }
      window.dispatchEvent(new Event("aero_auth_ready"));
      return;
    }
    if (!configured()) {
      if (status) status.textContent = "Setup required";
      if (notice) {
        notice.textContent =
          "Sign in is enabled but Cognito configuration is missing in config.js.";
        notice.classList.remove("hidden");
      }
      return;
    }
    try {
      await finish_sign_in();
    } catch (error) {
      if (notice) {
        notice.textContent = error.message;
        notice.classList.remove("hidden");
      }
    }
    access_token = sessionStorage.getItem("aero_token");
    expiry = Number(sessionStorage.getItem("aero_expires"));
    if (access_token && Date.now() < expiry) {
      if (status) status.textContent = "Signed in";
      logout?.classList.remove("hidden");
      content?.classList.remove("hidden");
      window.dispatchEvent(new Event("aero_auth_ready"));
    } else {
      access_token = null;
      if (status) status.textContent = "Sign in required";
      login?.classList.remove("hidden");
      if (notice && notice.classList.contains("hidden")) {
        notice.textContent =
          "Sign in with your authorized account to use the dashboard.";
        notice.classList.remove("hidden");
      }
    }
  }
  window.aero_auth = {
    get_token: () =>
      access_token && Date.now() < expiry ? access_token : null,
    sign_in,
    sign_out,
  };
  document.addEventListener("DOMContentLoaded", init_auth);
})();

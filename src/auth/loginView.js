import { signIn } from "./session.js";

/** Show the login page. onSuccess() runs after a valid sign-in. */
export function showLogin(onSuccess, firstMsg = "") {
  const box = document.getElementById("auth");
  document.querySelector(".app").hidden = true;
  box.hidden = false;
  box.innerHTML =
    '<form class="auth-card" id="loginForm" novalidate>' +
      '<div class="auth-brand"><i></i><span>StockLedger</span></div>' +
      "<h1>Sign in</h1>" +
      '<label for="lg_email">Email</label>' +
      '<input id="lg_email" type="email" autocomplete="username" inputmode="email" required>' +
      '<label for="lg_pass">Password</label>' +
      '<input id="lg_pass" type="password" autocomplete="current-password" required>' +
      '<p class="auth-err" id="lg_err" role="alert"></p>' +
      '<button class="auth-btn" id="lg_btn" type="submit">Sign in</button>' +
    "</form>";

  const err = box.querySelector("#lg_err");
  const btn = box.querySelector("#lg_btn");
  err.textContent = firstMsg;

  box.querySelector("#loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = box.querySelector("#lg_email").value;
    const pass = box.querySelector("#lg_pass").value;
    if (!email.trim() || !pass) { err.textContent = "Enter your email and password."; return; }
    btn.disabled = true; btn.textContent = "Signing in…"; err.textContent = "";
    const r = await signIn(email, pass);
    if (r.ok) { box.hidden = true; box.innerHTML = ""; document.querySelector(".app").hidden = false; onSuccess(); return; }
    err.textContent = r.msg; btn.disabled = false; btn.textContent = "Sign in";
    box.querySelector("#lg_pass").value = "";
  });
}
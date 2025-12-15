

//name
export function validateName(name) {
  const nameRegex = /^[A-Za-z](?:[A-Za-z'-]{1,})(?:\s+[A-Za-z'-]{2,})*$/;
  return nameRegex.test(name.trim())
}
//  Email
export function validateEmail(email) {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email.trim());
}

//  Password
export function validatePassword(password) {
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
  return passwordRegex.test(password.trim());
}

// Create or reuse error element
export function showError(inputEl, msg) {
  const formGroup = inputEl.closest(".form-group");

  let errorEl = formGroup.querySelector(".error-msg");
  if (!errorEl) {
    errorEl = document.createElement("div");
    errorEl.className = "error-msg";
    errorEl.style.color = "#d32f2f";
    errorEl.style.fontSize = "13px";
    errorEl.style.marginTop = "5px";
    formGroup.appendChild(errorEl);
  }
  errorEl.textContent = msg;
}

// Clear error
export function clearError(inputEl) {
  const formGroup = inputEl.closest(".form-group");
  const errorEl = formGroup.querySelector(".error-msg");
  if (errorEl) errorEl.textContent = "";
}

export function PasswordMatch(password, confirmPassword) {
  return password.trim() === confirmPassword.trim();
}
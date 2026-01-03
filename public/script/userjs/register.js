
window.togglePassword=function togglePassword(button) {
  const targetId = button.getAttribute('data-target');
  const input = document.getElementById(targetId);
  const svgPath = button.querySelector('path');

  // Path data for eye (visible) and eye-off (cross)
  const eye = "M12 5C7 5 2.73 8.11 1 12.5C2.73 16.89 7 20 12 20C17 20 21.27 16.89 23 12.5C21.27 8.11 17 5 12 5ZM12 17.5C9.24 17.5 7 15.26 7 12.5C7 9.74 9.24 7.5 12 7.5C14.76 7.5 17 9.74 17 12.5C17 15.26 14.76 17.5 12 17.5ZM12 9.5C10.34 9.5 9 10.84 9 12.5C9 14.16 10.34 15.5 12 15.5C13.66 15.5 15 14.16 15 12.5C15 10.84 13.66 9.5 12 9.5Z";
  const eyeOff = "M2 4.27L4.28 6.55L4.74 7.01C3.08 8.3 1.78 10.02 1 12C2.73 16.39 7 19.5 12 19.5C13.55 19.5 15.03 19.2 16.38 18.66L16.8 19.08L19.73 22L21 20.73L3.27 3L2 4.27ZM7.53 9.8L9.08 11.35C9.03 11.56 9 11.78 9 12C9 13.66 10.34 15 12 15C12.22 15 12.44 14.97 12.65 14.92L14.2 16.47C13.53 16.8 12.79 17 12 17C9.24 17 7 14.76 7 12C7 11.21 7.2 10.47 7.53 9.8ZM11.84 9.02L14.99 12.17L15.01 12.01C15.01 10.35 13.67 9.01 12.01 9.01L11.84 9.02Z";

  // Toggle input type and icon
  if (input.type === 'password') {
    input.type = 'text';
    svgPath.setAttribute('d', eyeOff); // Show cross
  } else {
    input.type = 'password';
    svgPath.setAttribute('d', eye); // Show eye
  }
}
    import { validateName,validateEmail,validatePassword,showError,clearError,PasswordMatch} from "/js/utils/validation.js"
  document.addEventListener("DOMContentLoaded", function () {
  const name = document.getElementById("name");
  const RegisterForm = document.getElementById("RegisterForm");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const confirmPasswordInput = document.getElementById("confirm-password");

  // --- Referral Code Toggle Logic ---
const showReferralBtn = document.getElementById("show-referral-btn");
const referralInputGroup = document.getElementById("referral-input-group");
const removeReferralBtn = document.getElementById("remove-referral");
const referralInput = document.getElementById("referredByCode");

// Click to show input
showReferralBtn.addEventListener("click", () => {
    showReferralBtn.style.display = "none";
    referralInputGroup.style.display = "block";
    referralInput.focus();
});

// Click to hide and clear input
removeReferralBtn.addEventListener("click", () => {
    referralInputGroup.style.display = "none";
    showReferralBtn.style.display = "block";
    referralInput.value = ""; // Clear the input
});

  RegisterForm.addEventListener("submit",function(e){
    let valid = true;
    if(!validateName(name.value.trim())){
     showError(name,"Please enter a valid full name (letters only)")
     valid = false;
    }else{
      clearError(name)
    }
    if(!validateEmail(emailInput.value.trim())){
        showError(emailInput,"Please enter a valid email address")
        valid = false;
    }else{
        clearError(emailInput);
    }
    if(!validatePassword(passwordInput.value.trim())){
        showError(passwordInput, "Password must be at least 8 characters, contain a letter, a number, and a special character.")
        valid = false;
    }else{
        clearError(passwordInput);
    }
    if(!PasswordMatch(passwordInput.value,confirmPasswordInput.value)){
      showError(confirmPasswordInput,"Password do not match")
      valid = false;
    }else{
      clearError(confirmPasswordInput)
    }
    if(!valid){
      e.preventDefault();
    }
  });
});
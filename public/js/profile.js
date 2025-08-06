function validateProfileForm() {
  const name = document.querySelector('input[name="name"]').value.trim();
  const phone = document.querySelector('input[name="phone"]').value.trim();
  const email = document.querySelector('input[name="email"]').value.trim();
  const nickname = document
    .querySelector('input[name="nickname"]')
    .value.trim();
  const gender = document.querySelector('select[name="gender"]').value;
  const passwordInput = document.querySelector('input[name="password"]');
  const password = passwordInput ? passwordInput.value.trim() : "";

  const phoneRegex = /^01[0-9]-?\d{3,4}-?\d{4}$/;
  const passwordRegex = /^.{6,}$/;
  const nameRegex = /^[가-힣a-zA-Z\s]{2,}$/;
  const emailRegex = /^[^\s@]+@[^\s@]+$/;

  if (!nameRegex.test(name)) {
    alert("이름은 한글 또는 영문으로 2자 이상 입력해주세요.");
    return false;
  }

  if (!phoneRegex.test(phone)) {
    alert("올바른 전화번호 형식으로 입력해주세요. 예: 010-1234-5678");
    return false;
  }

  if (!emailRegex.test(email)) {
    alert("올바른 이메일 형식으로 입력해주세요.");
    return false;
  }

  if (!["M", "F"].includes(gender)) {
    alert("성별을 선택해주세요.");
    return false;
  }

  if (password && !passwordRegex.test(password)) {
    alert("비밀번호는 최소 6자 이상이어야 합니다.");
    return false;
  }

  return true;
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("form[action='/profile/update']");
  if (form) {
    form.addEventListener("submit", function (e) {
      if (!validateProfileForm()) {
        e.preventDefault();
      }
    });
  }
});

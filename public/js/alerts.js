export const showAlert = (type, msg) => {
  const existingAlert = document.querySelector('.alert');
  if (existingAlert) existingAlert.remove();

  const markup = `
    <div class="alert alert--${type}">
      ${msg}
    </div>
  `;

  document.body.insertAdjacentHTML('afterbegin', markup);

  setTimeout(() => {
    const el = document.querySelector('.alert');
    if (el) el.remove();
  }, 5000);
};
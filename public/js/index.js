// Polyfill for older browsers to support modern JS features
import '@babel/polyfill';

// Import authentication and user update functions
import { login } from './login';
import { logout } from './logout';
import { updateUser , updatePassword} from './updateSettings';
import {bookTour} from './stripe';

// ======================
// LOGIN FORM HANDLER
// ======================

// Select the login form
const formLogin = document.querySelector('.form--login');

// If the login form exists on the page
if (formLogin) {
  formLogin.addEventListener('submit', e => {
    e.preventDefault(); // Prevent page reload on form submit

    // Get user input values
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    // Call login function with entered credentials
    login(email, password);
  });
}

// ======================
// LOGOUT BUTTON HANDLER
// ======================

// Select logout button
const logoutBtn = document.querySelector('.nav__el--logout');

// If logout button exists
if (logoutBtn) {
  // Call logout function when clicked
  logoutBtn.addEventListener('click', logout);
}

// ======================
// UPDATE USER DATA FORM
// ======================

// Select the user data update form
const userFormData = document.querySelector('.form-user-data');

// If the form exists
if (userFormData) {
  userFormData.addEventListener('submit', e => {
    e.preventDefault();
// 🔥 Simple rule to remember
// 📄 Text only  → use object {}
// 🖼️ Text+file  → use FormData
    const form = new FormData();
    form.append('name', document.getElementById('name').value);
    form.append('email', document.getElementById('email').value);
    form.append('photo', document.getElementById('photo').files[0]);

    updateUser(form);
  });
}


// ======================
// UPDATE USER Password
// ======================

// Select the user data update form
const userFormSettings = document.querySelector('.form-user-settings');

// If the form exists
if (userFormSettings) {
  userFormSettings.addEventListener('submit', e => {
    e.preventDefault(); // Prevent default form submission

    // Get updated user data from inputs
    const currentPassword = document.getElementById('password-current').value;
    const newPassword = document.getElementById('password-new').value;
    const passwordConfirm = document.getElementById('password-confirm').value;


    // Call API function to update user data
    updatePassword(currentPassword, newPassword,passwordConfirm);
  });
}

// ======================
// Book Tour 
// ======================

const bookBtn = document.getElementById('book-tour');

if (bookBtn)
  bookBtn.addEventListener('click', async e => {
    e.target.textContent = 'Processing...';
    e.target.disabled = true;                    // ← prevent double-clicks

    const { tourId } = e.target.dataset;
    await bookTour(tourId);

    e.target.textContent = 'Book tour now!';     // ← reset on failure
    e.target.disabled = false;                   // ← re-enable on failure
  });

// e.currentTarget → the element you attached the listener to (<button>)
// .dataset → contains all attributes starting with data-
// .tourId → automatically converts data-tour-id → tourId

// So tourId becomes "123" (a string).
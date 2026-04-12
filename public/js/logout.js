import axios from 'axios';
import { showAlert } from './alerts';
export const logout = async () => {
  try {
    const res = await axios({
      method: 'GET',
      url: '/api/v1/users/logout',
      withCredentials: true // ✅ REQUIRED for cookies
    }
    );

    if (res.data.status === 'success') {
      showAlert('success', 'Logged out successfully!');
      // redirect to login page
      window.setTimeout(() => {
        location.assign('/login');
      }, 1500); // optional delay to show alert
    }
  } catch (err) {
    showAlert('error', 'Error logging out! Try again.');
  }
};
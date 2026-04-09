import axios from 'axios';
import { showAlert } from './alerts';

export const login = async (email, password) => {
   try {
    const res = await axios.post(
      '/api/v1/users/login',
      { email, password },
      { withCredentials: true }
    );
    if (res.data.status === 'success') {
      showAlert('success', 'Logged in successfully!');
      window.setTimeout(() => {
        window.location.assign('/');
      }, 1500);
    }

  } catch (err) {
   showAlert('error', err.response.data.message);
  }
};

  

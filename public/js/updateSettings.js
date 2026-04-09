import axios from 'axios';
import { showAlert } from './alerts';

export const updateUser = async (form) => {
   try {
    const res = await axios.patch(
      '/api/v1/users/updateMe',
      form,
      { withCredentials: true }
    );

    if (res.data.status === 'success') {
      showAlert('success', 'update successfully!');
      window.setTimeout(() => {
        window.location.assign('/account');
      }, 1500);
    }

  } catch (err) {
const msg = err?.response?.data?.message || 'Something went wrong!';
showAlert('error', msg);  }
};
export const updatePassword = async (currentPassword, newPassword,passwordConfirm) => {
   try {
    const res = await axios.patch(
      '/api/v1/users/updateMyPassword',
      { currentPassword, newPassword,passwordConfirm},
      { withCredentials: true }
    );

    if (res.data.status === 'success') {
      showAlert('success', 'update successfully!');
      window.setTimeout(() => {
        window.location.assign('/account');
      }, 1500);
    }

  } catch (err) {
const msg = err?.response?.data?.message || 'Something went wrong!';
showAlert('error', msg);  }
};

  

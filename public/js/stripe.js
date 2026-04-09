import axios from 'axios';
import { loadStripe } from '@stripe/stripe-js';

// Don't use top-level await — initialize lazily instead
let stripePromise;
const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe('pk_test_51TJDBxDAHdlz4p9tKxn6P5c0L6vtk2PbwDLtgQp9AeQnBnbJVH2jdVxGjoyzrwQKC7rOTIyhjmPhanrkyQLGfnnf00LPdLavj0');
  }
  return stripePromise;
};

export const bookTour = async (tourId) => {
  try {
    const stripe = await getStripe(); // resolve here, inside async fn

    const res = await axios.get(`/api/v1/bookings/checkout-session/${tourId}`);

    await stripe.redirectToCheckout({
      sessionId: res.data.session.id,
    });
  } catch (err) {
    alert('Something went wrong with booking the tour!');
  }
};
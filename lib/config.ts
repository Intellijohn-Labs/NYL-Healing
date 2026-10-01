// Registration day fee per patient, in rupees
export const REGISTRATION_FEE = 600;

// Most people that can be registered in one form
export const MAX_PATIENTS = 5;

// Switch on when online payment is built: set NEXT_PUBLIC_ONLINE_PAYMENT=true in Vercel
export const ONLINE_PAYMENT_ENABLED = process.env.NEXT_PUBLIC_ONLINE_PAYMENT === 'true';

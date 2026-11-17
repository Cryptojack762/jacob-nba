// One place to flip launch settings.
export const SITE = {
  brand: 'K-Saju',                 // placeholder until Dustin + Jacob pick the name
  // Google Apps Script web app URL (the backend). Empty = demo mode (no real payments).
  api: 'https://script.google.com/macros/s/AKfycbyI-FjPvn1SjuXCed0UetFcmSDAUwuMl6Cnx1Z9Oppzs-Xkj3MpFBkYtsuMcXpqLokbGQ/exec',
  // 'waitlist' before Dec 15 (collect emails), 'live' from launch (Stripe checkout)
  mode: 'waitlist',
  product: { id: 'year2027', name: '2027 Year Ahead + Love Reading', price: '$14.99' },
};

// One place to flip launch settings.
export const SITE = {
  brand: 'K-Saju',                 // placeholder until Dustin + Jacob pick the name
  // Google Apps Script web app URL (the backend). Empty = demo mode (no real payments).
  api: 'https://script.google.com/macros/s/AKfycbyI-FjPvn1SjuXCed0UetFcmSDAUwuMl6Cnx1Z9Oppzs-Xkj3MpFBkYtsuMcXpqLokbGQ/exec',
  // 'waitlist' before Dec 15 (collect emails), 'live' from launch (Stripe checkout)
  mode: 'waitlist',
  // Gunghap (compatibility) entry points on the main page. Off until after the Dec 15 launch (Dustin's spec). compat.html still works by direct link for testing.
  gunghap: false,
  // Switch a feature on later by setting it to true.
  features: { dailyPush: false, aiGuide: false, fullReport: false, proAudio: false, cloudSync: false },
  product: { id: 'year2027', name: '2027 Year Ahead + Love Reading', price: '$14.99' },
};

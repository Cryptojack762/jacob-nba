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
  features: { dailyEmail: true, dailyPush: false, aiGuide: true, chatCredits: false, fullReport: false, proAudio: false, cloudSync: false },
  chatFree: 1,   // free Haneul answers per phone
  // Readings menu (buttons show "Soon" until payments are live; prices are placeholders for Jacob + Dustin to approve)
  shop: [
    { id: 'q_money', name: 'Money reading', price: '$4.99' },
    { id: 'q_career', name: 'Career reading', price: '$4.99' },
    { id: 'q_love', name: 'Love reading', price: '$4.99' },
    { id: 'q_dates', name: 'Lucky dates for the next 3 months', price: '$4.99' },
    { id: 'couple', name: 'Couple report', price: '$29.99' },
    { id: 'gift', name: 'Gift a reading', price: '$14.99', note: 'Gift readings open before the holidays.' },
    { id: 'chat10', name: '10 more Haneul answers', price: '$4.99' },
  ],
  product: { id: 'year2027', name: '2027 Year Ahead + Love Reading', price: '$14.99' },
};

const isLocalHost = ['localhost', '127.0.0.1'].includes(
  globalThis.location?.hostname ?? ''
);

export const environment = {
  production: false,
  API_URL: isLocalHost
    ? 'http://localhost:3000/api/v1'
    : 'https://bk-actas-sodimac.onrender.com/api/v1',
};

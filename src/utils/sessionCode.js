const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateUniqueCode() {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CHARSET[Math.floor(Math.random() * CHARSET.length)];
  }
  return code;
}

// 圖片放在 client/public/manus-storage/，靜態部署也帶得走；
// 前綴 BASE_URL 讓 GitHub Pages 這類子路徑主機（/repo/）也能正確解析。
const base = import.meta.env.BASE_URL;

export const logoUrl = `${base}manus-storage/fit-quest-loop-logo-v2_5f91735a.png`;
export const mapUrl = `${base}manus-storage/fit-quest-loop-map-v2_b3a154e8.jpg`;
export const avatarUrl = `${base}manus-storage/fit-quest-loop-avatar-v2_ec04e517.png`;
export const monsterUrl = `${base}manus-storage/fit-quest-loop-monster-v2_f63283e9.png`;

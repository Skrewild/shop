import axios from "axios";
const api = axios.create({
  baseURL: "https://shop-kw6q.onrender.com",
});

export function adminApi(secret) {
  return axios.create({
    baseURL: "https://shop-kw6q.onrender.com",
    headers: { "x-admin-secret": secret }
  });
}
export default api;

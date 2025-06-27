import api from "./api";

const ADMIN_SECRET = "1234";

const adminApi = {
  getProducts: () => api.get("/products"),
  addProduct: (data) => api.post("/products/add", data, {
    headers: { "x-admin-secret": ADMIN_SECRET }
  }),
  updateProduct: (id, data) => api.put(`/products/${id}`, data, {
    headers: { "x-admin-secret": ADMIN_SECRET }
  }),
  deleteProduct: (id) => api.delete(`/products/${id}`, {
    headers: { "x-admin-secret": ADMIN_SECRET }
  }),
  getOrders: () => api.get("/admin/orders", {
    headers: { "x-admin-secret": ADMIN_SECRET }
  }),
  deleteOrder: (id) => api.delete(`/admin/orders/${id}`, {
    headers: { "x-admin-secret": ADMIN_SECRET }
  }),
};

export default adminApi;

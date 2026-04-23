// frontend/src/services/api.js
import axios from 'axios';

// Cấu hình base URL: tự động phát hiện môi trường dev/prod
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000, // 10s timeout
});

// Interceptor: log request/response để debug dễ hơn (có thể tắt khi production)
api.interceptors.request.use(config => {
  console.log(`📤 [API] ${config.method?.toUpperCase()} ${config.url}`);
  return config;
});

api.interceptors.response.use(
  response => response,
  error => {
    console.error(`❌ [API Error] ${error.config?.url}`, error.message);
    return Promise.reject(error);
  }
);

// Các hàm gọi API chuẩn hóa
export const accountAPI = {
  // Lấy danh sách giao dịch của account, hỗ trợ filter
  getTransactions: async (accountId, filters = {}) => {
    const params = new URLSearchParams(filters);
    const { data } = await api.get(`/accounts/${accountId}/transactions?${params}`);
    return data; // { success: true, data: [...], meta: {...} }
  },
  
  // (Optional) Lấy thông tin account
  getAccountInfo: async (accountId) => {
    const { data } = await api.get(`/accounts/${accountId}`);
    return data;
  }
};

export default api;
import axios from 'axios'

const client = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

client.interceptors.response.use(
  (res) => res,
  (err) => {
    const message = err.response?.data?.detail ?? err.message ?? 'Erro desconhecido'
    return Promise.reject(new Error(Array.isArray(message) ? message[0]?.msg : message))
  }
)

export default client

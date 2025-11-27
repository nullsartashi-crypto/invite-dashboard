import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000
})

// 请求拦截器
api.interceptors.request.use(
  config => {
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// 响应拦截器
api.interceptors.response.use(
  response => {
    return response.data
  },
  error => {
    console.error('API请求失败:', error)
    return Promise.reject(error)
  }
)

// 邀请码管理
export const inviteCodeApi = {
  // 获取所有邀请码
  getAll: () => api.get('/invite-codes'),

  // 添加邀请码
  add: (data) => api.post('/invite-codes', data),

  // 更新邀请码
  update: (id, data) => api.put(`/invite-codes/${id}`, data),

  // 删除邀请码
  delete: (id) => api.delete(`/invite-codes/${id}`)
}

// 数据查询
export const dataApi = {
  // 获取每日数据
  getDailyData: (params) => api.get('/daily-data', { params }),

  // 获取昨日数据
  getYesterdayData: () => api.get('/yesterday-data'),

  // 获取汇总数据
  getSummary: (params) => api.get('/summary', { params }),

  // 获取仪表盘数据
  getDashboard: (params) => api.get('/dashboard', { params }),

  // 手动抓取数据
  fetchData: (inviteCode) => api.post('/fetch-data', { inviteCode }),

  // 获取定时任务状态
  getSchedulerStatus: () => api.get('/scheduler/status'),

  // 手动执行定时任务
  runScheduler: () => api.post('/scheduler/run')
}

export default api

<template>
  <div class="dashboard">
    <!-- 操作栏 -->
    <el-card class="toolbar">
      <el-row :gutter="20" align="middle">
        <el-col :span="6">
          <el-select v-model="selectedDays" @change="loadDashboardData" placeholder="选择统计天数">
            <el-option label="最近7天" :value="7" />
            <el-option label="最近14天" :value="14" />
            <el-option label="最近30天" :value="30" />
            <el-option label="最近60天" :value="60" />
            <el-option label="最近90天" :value="90" />
          </el-select>
        </el-col>
        <el-col :span="6">
          <el-button type="primary" @click="handleFetchData" :loading="fetching">
            立即抓取数据
          </el-button>
        </el-col>
        <el-col :span="12" style="text-align: right">
          <el-text type="info">最后更新: {{ lastUpdateTime }}</el-text>
        </el-col>
      </el-row>
    </el-card>

    <!-- 数据概览卡片 - 第一行：累计数据 -->
    <el-row :gutter="20" class="summary-cards" v-loading="loading">
      <el-col :span="8" :xs="12" :sm="8" :md="8" :lg="8">
        <el-card class="summary-card">
          <div class="card-content">
            <div class="card-icon user">
              <el-icon :size="32"><User /></el-icon>
            </div>
            <div class="card-info">
              <div class="card-title">累计邀请用户</div>
              <div class="card-value">{{ summary.totalInviteUsers || 0 }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="8" :xs="12" :sm="8" :md="8" :lg="8">
        <el-card class="summary-card">
          <div class="card-content">
            <div class="card-icon trade-user">
              <el-icon :size="32"><ShoppingCart /></el-icon>
            </div>
            <div class="card-info">
              <div class="card-title">累计交易用户</div>
              <div class="card-value">{{ summary.totalTradeUsers || 0 }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="8" :xs="12" :sm="8" :md="8" :lg="8">
        <el-card class="summary-card">
          <div class="card-content">
            <div class="card-icon trade-amount">
              <el-icon :size="32"><Money /></el-icon>
            </div>
            <div class="card-info">
              <div class="card-title">累计邀请交易额</div>
              <div class="card-value">{{ formatAmount(summary.totalTradeAmount) }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 数据概览卡片 - 第二行：昨日新增数据 -->
    <el-row :gutter="20" class="summary-cards" v-loading="loading" style="margin-top: 20px;">
      <el-col :span="8" :xs="12" :sm="8" :md="8" :lg="8">
        <el-card class="summary-card yesterday-card">
          <div class="card-content">
            <div class="card-icon yesterday-user">
              <el-icon :size="32"><User /></el-icon>
            </div>
            <div class="card-info">
              <div class="card-title">昨日新增用户</div>
              <div class="card-value">{{ summary.yesterdayNewInviteUsers || 0 }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="8" :xs="12" :sm="8" :md="8" :lg="8">
        <el-card class="summary-card yesterday-card">
          <div class="card-content">
            <div class="card-icon yesterday-trade-user">
              <el-icon :size="32"><ShoppingCart /></el-icon>
            </div>
            <div class="card-info">
              <div class="card-title">昨日新增交易用户</div>
              <div class="card-value">{{ summary.yesterdayNewTradeUsers || 0 }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="8" :xs="12" :sm="8" :md="8" :lg="8">
        <el-card class="summary-card yesterday-card">
          <div class="card-content">
            <div class="card-icon yesterday-trade-amount">
              <el-icon :size="32"><Money /></el-icon>
            </div>
            <div class="card-info">
              <div class="card-title">昨日新增交易额</div>
              <div class="card-value">{{ formatAmount(summary.yesterdayNewTradeAmount) }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 图表区域 -->
    <el-row :gutter="20" class="charts">
      <el-col :span="24">
        <el-card>
          <template #header>
            <span>每日邀请用户趋势</span>
          </template>
          <div ref="inviteUsersChart" style="width: 100%; height: 350px"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="charts">
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>每日交易用户趋势</span>
          </template>
          <div ref="tradeUsersChart" style="width: 100%; height: 300px"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>每日交易额趋势</span>
          </template>
          <div ref="tradeAmountChart" style="width: 100%; height: 300px"></div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 详细数据表格 -->
    <el-card class="data-table">
      <template #header>
        <span>各邀请码最新数据</span>
      </template>
      <el-table :data="latestData" style="width: 100%" stripe>
        <el-table-column prop="invite_code" label="邀请码" width="120" />
        <el-table-column prop="invite_code_name" label="名称" width="150" />
        <el-table-column prop="record_date" label="日期" width="120" />
        <el-table-column prop="total_invite_users" label="累计邀请用户" width="130" align="right" />
        <el-table-column prop="total_trade_users" label="累计交易用户" width="130" align="right" />
        <el-table-column label="累计邀请交易额" width="150" align="right">
          <template #default="{ row }">
            {{ formatAmount(row.total_trade_amount) }}
          </template>
        </el-table-column>
        <el-table-column label="昨日新增用户" width="130" align="right">
          <template #default="{ row }">
            <el-tag v-if="row.daily_new_invite_users > 0" type="success">
              +{{ row.daily_new_invite_users }}
            </el-tag>
            <span v-else>0</span>
          </template>
        </el-table-column>
        <el-table-column label="昨日新增交易用户" width="150" align="right">
          <template #default="{ row }">
            <el-tag v-if="row.daily_new_trade_users > 0" type="primary">
              +{{ row.daily_new_trade_users }}
            </el-tag>
            <span v-else>0</span>
          </template>
        </el-table-column>
        <el-table-column label="昨日新增交易额" width="150" align="right">
          <template #default="{ row }">
            <el-tag v-if="row.daily_new_trade_amount > 0" type="warning">
              +{{ formatAmount(row.daily_new_trade_amount) }}
            </el-tag>
            <span v-else>0</span>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { User, ShoppingCart, Money, Wallet, Coin } from '@element-plus/icons-vue'
import { dataApi } from '../api'
import * as echarts from 'echarts'
import dayjs from 'dayjs'

const loading = ref(false)
const fetching = ref(false)
const selectedDays = ref(7)
const lastUpdateTime = ref('-')
const summary = ref({
  totalInviteUsers: 0,
  totalTradeUsers: 0,
  totalTradeAmount: 0,
  totalCommissionFee: 0,
  // 新增：昨日新增数据
  yesterdayNewInviteUsers: 0,
  yesterdayNewTradeUsers: 0,
  yesterdayNewTradeAmount: 0
})
const latestData = ref([])
const trendData = ref([])

// 图表引用
const inviteUsersChart = ref(null)
const tradeUsersChart = ref(null)
const tradeAmountChart = ref(null)

let chartInstances = []

const formatAmount = (amount) => {
  if (!amount) return '0'

  const num = parseFloat(amount)

  // 百万级别（>= 1,000,000）
  if (num >= 1000000) {
    return (num / 1000000).toFixed(2) + 'm'
  }
  // 千级别（>= 1,000）
  else if (num >= 1000) {
    return (num / 1000).toFixed(2) + 'k'
  }
  // 小于 1000
  else {
    return num.toFixed(2)
  }
}

const loadDashboardData = async () => {
  loading.value = true
  try {
    const res = await dataApi.getDashboard({ days: selectedDays.value })
    if (res.success) {
      summary.value = res.summary
      latestData.value = res.latestData
      trendData.value = res.trendData
      lastUpdateTime.value = dayjs().format('YYYY-MM-DD HH:mm:ss')

      await nextTick()
      renderCharts()
    }
  } catch (error) {
    ElMessage.error('加载数据失败')
  } finally {
    loading.value = false
  }
}

const handleFetchData = async () => {
  fetching.value = true
  try {
    const res = await dataApi.fetchData()
    if (res.success) {
      ElMessage.success('数据抓取成功')
      await loadDashboardData()
    }
  } catch (error) {
    ElMessage.error('数据抓取失败')
  } finally {
    fetching.value = false
  }
}

const renderCharts = () => {
  // 销毁旧图表
  chartInstances.forEach(chart => chart.dispose())
  chartInstances = []

  if (!trendData.value || trendData.value.length === 0) {
    return
  }

  // 创建邀请码到备注名的映射
  const codeNameMap = {}
  if (latestData.value && latestData.value.length > 0) {
    latestData.value.forEach(item => {
      codeNameMap[item.invite_code] = item.invite_code_name || item.invite_code
    })
  }
  // 从trendData补充映射（防止latestData中没有某些邀请码）
  trendData.value.forEach(item => {
    if (!codeNameMap[item.invite_code] && item.invite_code_name) {
      codeNameMap[item.invite_code] = item.invite_code_name
    }
  })

  // 处理数据：按日期分组
  const dataByDate = {}
  trendData.value.forEach(item => {
    const date = item.record_date
    if (!dataByDate[date]) {
      dataByDate[date] = {
        date,
        inviteUsers: {},
        tradeUsers: {},
        tradeAmount: {},
        selfTradeAmount: {}
      }
    }
    dataByDate[date].inviteUsers[item.invite_code] = item.daily_new_invite_users
    dataByDate[date].tradeUsers[item.invite_code] = item.daily_new_trade_users
    dataByDate[date].tradeAmount[item.invite_code] = item.daily_new_trade_amount
    dataByDate[date].selfTradeAmount[item.invite_code] = item.daily_new_self_trade_amount
  })

  const dates = Object.keys(dataByDate).sort()
  const inviteCodes = [...new Set(trendData.value.map(item => item.invite_code))]
  const displayNames = inviteCodes.map(code => codeNameMap[code] || code)

  // 邀请用户趋势图
  if (inviteUsersChart.value) {
    const chart1 = echarts.init(inviteUsersChart.value)
    chartInstances.push(chart1)

    const series = inviteCodes.map((code, index) => ({
      name: displayNames[index],
      type: 'line',
      data: dates.map(date => dataByDate[date].inviteUsers[code] || 0),
      smooth: true
    }))

    // 添加总计系列
    series.unshift({
      name: '总计',
      type: 'line',
      data: dates.map(date => {
        return Object.values(dataByDate[date].inviteUsers)
          .reduce((sum, val) => sum + (val || 0), 0)
      }),
      smooth: true,
      lineStyle: { color: '#ff0000', width: 3 },
      itemStyle: { color: '#ff0000' },
      emphasis: { focus: 'series' }
    })

    chart1.setOption({
      tooltip: {
        trigger: 'item'
      },
      legend: {
        type: 'scroll',
        data: ['总计', ...displayNames],
        bottom: 10,
        pageButtonItemGap: 5,
        pageIconSize: 10
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '25%',
        top: '10%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: dates
      },
      yAxis: {
        type: 'value'
      },
      series
    })
  }

  // 交易用户趋势图
  if (tradeUsersChart.value) {
    const chart2 = echarts.init(tradeUsersChart.value)
    chartInstances.push(chart2)

    const series = inviteCodes.map((code, index) => ({
      name: displayNames[index],
      type: 'line',
      data: dates.map(date => dataByDate[date].tradeUsers[code] || 0),
      smooth: true
    }))

    // 添加总计系列
    series.unshift({
      name: '总计',
      type: 'line',
      data: dates.map(date => {
        return Object.values(dataByDate[date].tradeUsers)
          .reduce((sum, val) => sum + (val || 0), 0)
      }),
      smooth: true,
      lineStyle: { color: '#ff0000', width: 3 },
      itemStyle: { color: '#ff0000' },
      emphasis: { focus: 'series' }
    })

    chart2.setOption({
      tooltip: {
        trigger: 'item'
      },
      legend: {
        type: 'scroll',
        data: ['总计', ...displayNames],
        bottom: 10,
        pageButtonItemGap: 5,
        pageIconSize: 10
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '25%',
        top: '10%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: dates
      },
      yAxis: {
        type: 'value'
      },
      series
    })
  }

  // 交易额趋势图
  if (tradeAmountChart.value) {
    const chart3 = echarts.init(tradeAmountChart.value)
    chartInstances.push(chart3)

    const series = inviteCodes.map((code, index) => ({
      name: displayNames[index],
      type: 'line',
      data: dates.map(date => dataByDate[date].tradeAmount[code] || 0),
      smooth: true
    }))

    // 添加总计系列
    series.unshift({
      name: '总计',
      type: 'line',
      data: dates.map(date => {
        return Object.values(dataByDate[date].tradeAmount)
          .reduce((sum, val) => sum + (val || 0), 0)
      }),
      smooth: true,
      lineStyle: { color: '#ff0000', width: 3 },
      itemStyle: { color: '#ff0000' },
      emphasis: { focus: 'series' }
    })

    chart3.setOption({
      tooltip: {
        trigger: 'item',
        formatter: function(params) {
          return `${params.name}<br/>${params.seriesName}: ${formatAmount(params.value)}`
        }
      },
      legend: {
        type: 'scroll',
        data: ['总计', ...displayNames],
        bottom: 10,
        pageButtonItemGap: 5,
        pageIconSize: 10
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '25%',
        top: '10%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: dates
      },
      yAxis: {
        type: 'value'
      },
      series
    })
  }
}

onMounted(() => {
  loadDashboardData()

  // 响应式调整图表大小
  window.addEventListener('resize', () => {
    chartInstances.forEach(chart => chart.resize())
  })
})

onBeforeUnmount(() => {
  chartInstances.forEach(chart => chart.dispose())
})
</script>

<style scoped>
.dashboard {
  padding: 20px;
  background: #f5f7fa;
  min-height: 100vh;
}

.toolbar {
  margin-bottom: 20px;
  border-radius: 8px;
}

.summary-cards {
  margin-bottom: 20px;
}

.summary-card {
  cursor: pointer;
  transition: all 0.3s;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
  background: #ffffff;
}

.summary-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.08);
  border-color: #409eff;
}

.card-content {
  display: flex;
  align-items: center;
}

.card-icon {
  width: 56px;
  height: 56px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
}

/* 专业配色方案 */
.card-icon.user { background: #e8f4fd; color: #1890ff; }
.card-icon.trade-user { background: #e6f7ff; color: #0050b3; }
.card-icon.trade-amount { background: #fff7e6; color: #d48806; }
.card-icon.self-trade { background: #f0f5ff; color: #597ef7; }
.card-icon.commission { background: #f6ffed; color: #52c41a; }

/* 昨日数据卡片配色方案 */
.card-icon.yesterday-user { background: #fff0f6; color: #c41d7f; }
.card-icon.yesterday-trade-user { background: #e6fffb; color: #08979c; }
.card-icon.yesterday-trade-amount { background: #fffbe6; color: #d4b106; }

.card-info {
  flex: 1;
}

.card-title {
  font-size: 13px;
  color: #8c8c8c;
  margin-bottom: 8px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.card-value {
  font-size: 32px;
  font-weight: 700;
  color: #262626;
  font-family: 'SF Mono', 'Monaco', 'Courier New', monospace;
  letter-spacing: -1px;
}

.charts {
  margin-bottom: 20px;
}

.charts :deep(.el-card) {
  border-radius: 8px;
  border: 1px solid #e4e7ed;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.charts :deep(.el-card__header) {
  border-bottom: 2px solid #f0f2f5;
  padding: 16px 20px;
  background: #fafafa;
  font-weight: 600;
  color: #262626;
}

.data-table {
  margin-top: 20px;
}

.data-table :deep(.el-table) {
  font-family: 'SF Mono', 'Monaco', 'Courier New', monospace;
}

.data-table :deep(.el-table th) {
  background: #fafafa;
  color: #262626;
  font-weight: 600;
  font-size: 13px;
}

.data-table :deep(.el-table td) {
  font-size: 14px;
}
</style>

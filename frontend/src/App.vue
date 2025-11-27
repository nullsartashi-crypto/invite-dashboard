<template>
  <div id="app">
    <el-container>
      <el-header>
        <div class="header-content">
          <h1>邀请数据统计系统</h1>
          <div class="header-right">
            <el-button @click="showInviteManager = !showInviteManager">
              {{ showInviteManager ? '查看仪表盘' : '管理邀请码' }}
            </el-button>
          </div>
        </div>
      </el-header>
      <el-main>
        <InviteCodeManager v-if="showInviteManager" />
        <Dashboard v-else />
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import InviteCodeManager from './components/InviteCodeManager.vue'
import Dashboard from './components/Dashboard.vue'

const showInviteManager = ref(false)
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

#app {
  font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB',
    'Microsoft YaHei', Arial, sans-serif;
  min-height: 100vh;
  background: #f5f7fa;
}

.el-header {
  background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
  color: white;
  display: flex;
  align-items: center;
  padding: 0 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.header-content {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-content h1 {
  font-size: 24px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.el-main {
  padding: 0;
  background: #f5f7fa;
}
</style>

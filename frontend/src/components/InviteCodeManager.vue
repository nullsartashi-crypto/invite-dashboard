<template>
  <el-card class="invite-code-manager">
    <template #header>
      <div class="card-header">
        <span>邀请码管理</span>
        <el-button type="primary" @click="showAddDialog">添加邀请码</el-button>
      </div>
    </template>

    <el-table :data="inviteCodes" style="width: 100%" v-loading="loading">
      <el-table-column prop="invite_code" label="邀请码" width="180" />
      <el-table-column prop="name" label="名称/备注" />
      <el-table-column prop="status" label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.status === 1 ? 'success' : 'info'">
            {{ row.status === 1 ? '启用' : '禁用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="created_at" label="创建时间" width="180">
        <template #default="{ row }">
          {{ formatTime(row.created_at) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="250">
        <template #default="{ row }">
          <el-button
            size="small"
            :type="row.status === 1 ? 'warning' : 'success'"
            @click="toggleStatus(row)"
          >
            {{ row.status === 1 ? '禁用' : '启用' }}
          </el-button>
          <el-button size="small" @click="showEditDialog(row)">编辑</el-button>
          <el-button
            size="small"
            type="danger"
            @click="deleteCode(row)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 添加/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'add' ? '添加邀请码' : '编辑邀请码'"
      width="500px"
    >
      <el-form :model="form" label-width="100px">
        <el-form-item label="邀请码" required>
          <el-input
            v-model="form.inviteCode"
            placeholder="请输入邀请码"
            :disabled="dialogMode === 'edit'"
          />
        </el-form-item>
        <el-form-item label="名称/备注">
          <el-input
            v-model="form.name"
            placeholder="请输入名称或备注"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">
          确定
        </el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { inviteCodeApi } from '../api'
import dayjs from 'dayjs'

const inviteCodes = ref([])
const loading = ref(false)
const dialogVisible = ref(false)
const dialogMode = ref('add')
const submitting = ref(false)
const form = ref({
  id: null,
  inviteCode: '',
  name: ''
})

const formatTime = (time) => {
  return dayjs(time).format('YYYY-MM-DD HH:mm:ss')
}

const loadInviteCodes = async () => {
  loading.value = true
  try {
    const res = await inviteCodeApi.getAll()
    if (res.success) {
      inviteCodes.value = res.data
    }
  } catch (error) {
    ElMessage.error('加载邀请码失败')
  } finally {
    loading.value = false
  }
}

const showAddDialog = () => {
  dialogMode.value = 'add'
  form.value = {
    id: null,
    inviteCode: '',
    name: ''
  }
  dialogVisible.value = true
}

const showEditDialog = (row) => {
  dialogMode.value = 'edit'
  form.value = {
    id: row.id,
    inviteCode: row.invite_code,
    name: row.name || ''
  }
  dialogVisible.value = true
}

const handleSubmit = async () => {
  if (!form.value.inviteCode) {
    ElMessage.warning('请输入邀请码')
    return
  }

  submitting.value = true
  try {
    if (dialogMode.value === 'add') {
      const res = await inviteCodeApi.add({
        inviteCode: form.value.inviteCode,
        name: form.value.name
      })
      if (res.success) {
        ElMessage.success('添加成功')
        dialogVisible.value = false
        loadInviteCodes()
      }
    } else {
      const res = await inviteCodeApi.update(form.value.id, {
        name: form.value.name
      })
      if (res.success) {
        ElMessage.success('更新成功')
        dialogVisible.value = false
        loadInviteCodes()
      }
    }
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '操作失败')
  } finally {
    submitting.value = false
  }
}

const toggleStatus = async (row) => {
  try {
    const newStatus = row.status === 1 ? 0 : 1
    const res = await inviteCodeApi.update(row.id, { status: newStatus })
    if (res.success) {
      ElMessage.success('状态更新成功')
      loadInviteCodes()
    }
  } catch (error) {
    ElMessage.error('状态更新失败')
  }
}

const deleteCode = async (row) => {
  try {
    await ElMessageBox.confirm('确定要删除这个邀请码吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    const res = await inviteCodeApi.delete(row.id)
    if (res.success) {
      ElMessage.success('删除成功')
      loadInviteCodes()
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

onMounted(() => {
  loadInviteCodes()
})
</script>

<style scoped>
.invite-code-manager {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>

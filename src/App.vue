<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { initialTasks } from './data'

const loginForm = ref({
  username: '',
  password: '',
})

const currentUser = ref(null)
const tasks = ref(initialTasks.map((item) => ({ ...item })))
const chartRef = ref(null)
const chartLoading = ref(false)

let chartInstance = null
let chartApi = null

const roleMap = {
  admin: {
    label: '管理员',
    accent: '高权限模式',
  },
  user: {
    label: '普通用户',
    accent: '只读浏览模式',
  },
}

const summary = computed(() => {
  const totalHours = tasks.value.reduce((sum, item) => sum + item.hours, 0)
  const overtimeCount = tasks.value.filter((item) => item.overtime).length
  const projectCount = new Set(tasks.value.map((item) => item.project)).size

  return {
    totalHours: totalHours.toFixed(1),
    overtimeCount,
    projectCount,
    taskCount: tasks.value.length,
  }
})

const projectDistribution = computed(() => {
  const grouped = tasks.value.reduce((acc, item) => {
    acc[item.project] = (acc[item.project] || 0) + item.hours
    return acc
  }, {})

  return Object.entries(grouped)
    .map(([project, hours]) => ({
      project,
      hours: Number(hours.toFixed(1)),
    }))
    .sort((a, b) => b.hours - a.hours)
})

const canDelete = computed(() => currentUser.value?.role === 'admin')
const displayName = computed(() => currentUser.value?.username || '访客')

function handleLogin() {
  const username = loginForm.value.username.trim()
  const password = loginForm.value.password.trim()

  if (!username || !password) {
    window.alert('请输入用户名和密码。')
    return
  }

  currentUser.value = {
    username,
    role: username === 'admin' ? 'admin' : 'user',
  }
}

function handleLogout() {
  currentUser.value = null
  loginForm.value = {
    username: '',
    password: '',
  }
}

function removeTask(id) {
  if (!canDelete.value) {
    return
  }

  tasks.value = tasks.value.filter((item) => item.id !== id)
}

async function initializeChart() {
  if (!chartRef.value) {
    return
  }

  chartLoading.value = true

  if (!chartApi) {
    chartApi = await import('./chart.js')
  }

  chartInstance = await chartApi.createChart(chartRef.value)
  renderChart()
  window.addEventListener('resize', resizeChart)
  chartLoading.value = false
}

function resizeChart() {
  if (chartInstance) {
    chartInstance.resize()
  }
}

function renderChart() {
  if (!chartInstance || !chartApi) {
    return
  }

  const categories = projectDistribution.value.map((item) => item.project)
  const hours = projectDistribution.value.map((item) => item.hours)

  chartInstance.setOption({
    animationDuration: 900,
    animationEasing: 'cubicOut',
    grid: {
      left: 16,
      right: 12,
      top: 56,
      bottom: 18,
      containLabel: true,
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
      formatter(params) {
        const item = params[0]
        return `${item.name}<br/>累计工时：${item.value} 小时`
      },
    },
    xAxis: {
      type: 'category',
      data: categories,
      axisTick: {
        show: false,
      },
      axisLine: {
        lineStyle: {
          color: 'rgba(113, 138, 141, 0.35)',
        },
      },
      axisLabel: {
        color: '#365255',
        interval: 0,
        rotate: categories.length > 3 ? 16 : 0,
        fontSize: 12,
      },
    },
    yAxis: {
      type: 'value',
      name: 'Hours',
      nameTextStyle: {
        color: '#5f787b',
        padding: [0, 0, 0, 20],
      },
      splitLine: {
        lineStyle: {
          type: 'dashed',
          color: 'rgba(113, 138, 141, 0.18)',
        },
      },
      axisLine: {
        show: false,
      },
      axisLabel: {
        color: '#60797c',
      },
    },
    series: [
      {
        type: 'bar',
        data: hours,
        barWidth: 34,
        borderRadius: [12, 12, 4, 4],
        itemStyle: {
          color: chartApi.createGradient([
            { offset: 0, color: '#0d9aa5' },
            { offset: 1, color: '#76c5b8' },
          ]),
          shadowColor: 'rgba(10, 74, 78, 0.18)',
          shadowBlur: 20,
          shadowOffsetY: 8,
        },
        emphasis: {
          itemStyle: {
            color: chartApi.createGradient([
              { offset: 0, color: '#067d86' },
              { offset: 1, color: '#57b59e' },
            ]),
          },
        },
      },
    ],
  })
}

watch(projectDistribution, () => {
  renderChart()
})

watch(currentUser, async (user) => {
  if (user) {
    await nextTick()

    if (!chartInstance) {
      await initializeChart()
    } else {
      resizeChart()
      renderChart()
    }
  }
})

onMounted(() => {
  if (currentUser.value) {
    initializeChart()
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeChart)

  if (chartInstance) {
    chartInstance.dispose()
    chartInstance = null
  }
})
</script>

<template>
  <div class="app-shell">
    <div class="ambient ambient-left"></div>
    <div class="ambient ambient-right"></div>

    <main v-if="!currentUser" class="login-view">
      <section class="hero-card">
        <div class="hero-copy">
          <span class="eyebrow">Work Order Command Center</span>
          <h1>工单管理与图表展示</h1>
          <p>
            登录后进入统一面板，查看工单、识别项目工时分布，并根据角色控制删除权限。
          </p>

          <div class="hero-notes">
            <div class="note-card">
              <strong>admin</strong>
              <span>可查看工单、图表，并执行删除操作</span>
            </div>
            <div class="note-card">
              <strong>任意其他用户名</strong>
              <span>可查看工单与图表，仅作为普通用户浏览</span>
            </div>
          </div>
        </div>

        <section class="login-card">
          <div class="card-heading">
            <span class="card-pill">Secure Access</span>
            <h2>欢迎登录</h2>
            <p>请输入任意用户名和密码。用户名为 `admin` 时进入管理员权限。</p>
          </div>

          <form class="login-form" @submit.prevent="handleLogin">
            <label>
              <span>用户名</span>
              <input
                v-model="loginForm.username"
                type="text"
                placeholder="例如：admin"
                autocomplete="username"
              />
            </label>
            <label>
              <span>密码</span>
              <input
                v-model="loginForm.password"
                type="password"
                placeholder="任意输入即可"
                autocomplete="current-password"
              />
            </label>

            <button class="primary-btn" type="submit">Log In</button>
          </form>
        </section>
      </section>
    </main>

    <main v-else class="dashboard-view">
      <header class="topbar">
        <div>
          <span class="eyebrow">Tasks Workspace</span>
          <h1>工单总览面板</h1>
        </div>

        <div class="topbar-actions">
          <div class="user-badge">
            <span class="badge-name">{{ displayName }}</span>
            <span class="badge-role">
              {{ roleMap[currentUser.role].label }} · {{ roleMap[currentUser.role].accent }}
            </span>
          </div>
          <button class="ghost-btn" type="button" @click="handleLogout">退出登录</button>
        </div>
      </header>

      <section class="summary-grid">
        <article class="summary-card">
          <span>当前工单数</span>
          <strong>{{ summary.taskCount }}</strong>
        </article>
        <article class="summary-card">
          <span>项目数量</span>
          <strong>{{ summary.projectCount }}</strong>
        </article>
        <article class="summary-card">
          <span>累计工时</span>
          <strong>{{ summary.totalHours }}h</strong>
        </article>
        <article class="summary-card">
          <span>加班记录</span>
          <strong>{{ summary.overtimeCount }}</strong>
        </article>
      </section>

      <section class="workspace-panel">
        <div class="section-header">
          <div>
            <span class="section-label">Tasks</span>
            <h2>工单列表</h2>
          </div>
          <p>删除工单后，右侧柱状图会基于当前表格数据自动重算。</p>
        </div>

        <div class="workspace-grid">
          <section class="table-card">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Project</th>
                  <th>Overtime</th>
                  <th>Hours</th>
                  <th>Created At</th>
                  <th v-if="canDelete">Action</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="task in tasks" :key="task.id">
                  <td>{{ task.id }}</td>
                  <td>
                    <div class="project-cell">
                      <strong>{{ task.project }}</strong>
                    </div>
                  </td>
                  <td>
                    <span :class="['status-chip', task.overtime ? 'is-overtime' : 'is-regular']">
                      {{ task.overtime ? 'Yes' : 'No' }}
                    </span>
                  </td>
                  <td>{{ task.hours.toFixed(1) }}</td>
                  <td>{{ task.createdAt }}</td>
                  <td v-if="canDelete">
                    <button class="danger-btn" type="button" @click="removeTask(task.id)">
                      Delete
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </section>

          <section class="chart-card">
            <div class="chart-heading">
              <div>
                <span class="section-label">Insight</span>
                <h2>Project Hours Distribution</h2>
              </div>
              <p>按项目名称汇总当前列表中的累计工时。</p>
            </div>

            <div class="chart-wrap">
              <div ref="chartRef" class="chart-canvas"></div>
              <div v-if="chartLoading" class="chart-loading">图表加载中...</div>
            </div>
          </section>
        </div>
      </section>
    </main>
  </div>
</template>

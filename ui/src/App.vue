<template>
  <div class="min-h-screen bg-gray-50 flex flex-col items-center py-8 px-4">
    <div class="bg-emerald-50 rounded-xl shadow-lg w-full max-w-7xl p-6">
      <h2 class="text-2xl font-semibold text-emerald-800 mb-1">
        Estimated carbon savings and diesel savings
      </h2>
      <div class="grid grid-cols-2 gap-6 mb-6">
        <div class="bg-white p-4 rounded-lg shadow">
          <h3 class="font-semibold text-gray-700 mb-2 flex items-center gap-2">
            Estimated carbon savings
            <span class="text-xs text-gray-400">1 Tonne = 1,000 kg</span>
          </h3>
          <div class="flex justify-between items-center">
            <div>
              <p class="text-4xl font-bold text-emerald-600">{{ totalCarbon.toFixed(1) }}</p>
              <p class="text-gray-500 text-sm">Tonnes</p>
            </div>
            <div class="text-right">
              <p class="text-sm text-gray-400">Monthly</p>
              <p class="font-semibold text-gray-700">{{ (totalCarbon / 12).toFixed(1) }}</p>
            </div>
          </div>
        </div>

        <div class="bg-white p-4 rounded-lg shadow">
          <h3 class="font-semibold text-gray-700 mb-2">Estimated diesel savings</h3>
          <div class="flex justify-between items-center">
            <div>
              <p class="text-4xl font-bold text-indigo-600">{{ totalFuel.toLocaleString() }}</p>
              <p class="text-gray-500 text-sm">Litres</p>
            </div>
            <div class="text-right">
              <p class="text-sm text-gray-400">Monthly</p>
              <p class="font-semibold text-gray-700">{{ (totalFuel / 12).toFixed(1) }}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-3 mb-6">
        <select v-model="deviceId" class="border p-2 bg-white rounded min-w-[200px]">
          <option disabled value="" >Select a device</option>
          <option v-for="device in devices" :key="device.id" :value="device.id">
            {{ device.name }} ({{ device.id }})
          </option>
        </select>
        <input v-model="startDate" type="datetime-local" class="border p-2 rounded" />
        <input v-model="endDate" type="datetime-local" class="border p-2 rounded" />
        <button v-for="opt in ranges" :key="opt.label" @click="setRange(opt.days)"
          class="border border-gray-300 rounded px-3 py-1 text-sm hover:bg-gray-100">
          {{ opt.label }}
        </button>

        <div class="flex-grow"></div>
        <button @click="exportPNG" class="bg-emerald-600 text-white px-3 py-1 rounded text-sm hover:bg-emerald-700">
          Export PNG
        </button>
        <button @click="exportCSV" class="bg-indigo-600 text-white px-3 py-1 rounded text-sm hover:bg-indigo-700">
          Export CSV
        </button>
      </div>
      <div class="grid grid-cols-2 gap-6 mb-4">
        <div class="text-center">
          <p class="text-gray-500 text-sm">Estimated carbon savings</p>
          <p class="text-3xl text-emerald-600 font-bold">{{ rangeCarbon.toFixed(1) }}</p>
          <p class="text-gray-500 text-sm">Tonnes</p>
        </div>
        <div class="text-center">
          <p class="text-gray-500 text-sm">Estimated diesel savings</p>
          <p class="text-3xl text-indigo-600 font-bold">{{ (rangeFuel / 1000).toFixed(1) }} k</p>
          <p class="text-gray-500 text-sm">Litres</p>
        </div>
      </div>

      <div ref="chartRef" class="w-full h-[400px] bg-white rounded-lg shadow"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from "vue"
import * as echarts from "echarts"
import dayjs from "dayjs"
import { saveAs } from "file-saver"
import {API_BASE_URL}  from "../config.js"

const devices = ref([])
const deviceId = ref("")

const chartRef = ref(null)
let chart

const startDate = ref(dayjs().subtract(30, "day").format("YYYY-MM-DDTHH:mm"))
const endDate = ref(dayjs().format("YYYY-MM-DDTHH:mm"))

const totalCarbon = ref(0)
const totalFuel = ref(0)
const rangeCarbon = ref(0)
const rangeFuel = ref(0)
const chartData = ref([])
let chartLabels = []
let isAdjustingZoom = false
const MAX_ZOOM_MS = 24 * 60 * 60 * 1000

const ranges = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 60 days", days: 60 },
  { label: "Last year", days: 365 },
]

onMounted(() =>{
  fetchDevices()
})
watch([startDate, endDate, deviceId], () => fetchData())

async function fetchData() {
  if (!deviceId.value) return
  const url = `${API_BASE_URL}/savings?device_id=${deviceId.value}&start_date=${startDate.value}&end_date=${endDate.value}`
  try {
    const res = await fetch(url)
    const json = await res.json()
    chartData.value = json.data.map(d => ({
      timestamp: d.timestamp,
      carbon: parseFloat(d.carbon_saved),
      fuel: parseFloat(d.fueld_saved),
    }))
    computeStats()
    renderChart()
  } catch (error) {
    console.error("Failed to fetch savings data", error)
  }
}

async function fetchDevices() {
  try {
    const res = await fetch(`${API_BASE_URL}/devices`)
    const json = await res.json()
    devices.value = json
    if (!deviceId.value && devices.value.length) {
      deviceId.value = devices.value[0].id
    }
  } catch (error) {
    console.error("Failed to fetch devices", error)
  }
}

function computeStats() {
  totalCarbon.value = chartData.value.reduce((sum, d) => sum + d.carbon, 0)
  totalFuel.value = chartData.value.reduce((sum, d) => sum + d.fuel, 0)
  rangeCarbon.value = totalCarbon.value
  rangeFuel.value = totalFuel.value
}

function setRange(days) {
  endDate.value = dayjs().format("YYYY-MM-DDTHH:mm")
  startDate.value = dayjs().subtract(days, "day").format("YYYY-MM-DDTHH:mm")
  fetchData()
}

function renderChart() {
  if (!chartData.value.length) return
  chartLabels = chartData.value.map(d => d.timestamp)
  const carbon = chartData.value.map(d => d.carbon)
  const fuel = chartData.value.map(d => d.fuel)

  if (!chart) chart = echarts.init(chartRef.value)
  chart.off("datazoom")
  chart.setOption({
    tooltip: { trigger: "axis" },
    legend: { data: ["Carbon savings", "Diesel savings"] },
    toolbox: { feature: { restore: {}, saveAsImage: {} } },
    dataZoom: [
      { type: "inside", xAxisIndex: 0, zoomOnMouseWheel: true, moveOnMouseWheel: false },
    ],
    xAxis: [
      {
        type: "category",
        data: chartLabels,
        axisLabel: {
          formatter: value => dayjs(value).format("MMM DD HH:mm"),
        },
      },
    ],
    yAxis: [
      { type: "value", name: "Carbon (kg)" },
      { type: "value", name: "Fuel (L)", position: "right" },
    ],
    series: [
      { name: "Carbon savings", type: "bar", data: carbon, color: "#10b981" },
      { name: "Diesel savings", type: "bar", data: fuel, color: "#6366f1", yAxisIndex: 1 },
    ],
  })
  chart.on("datazoom", handleDataZoom)
}

function exportPNG() {
  const url = chart.getDataURL({ type: "png" })
  saveAs(url, "savings-chart.png")
}

function exportCSV() {
  let csv = "Timestamp,Carbon Saved (kg),Fuel Saved (L)\n"
  chartData.value.forEach(d => {
    csv += `${d.timestamp},${d.carbon},${d.fuel}\n`
  })
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  saveAs(blob, "savings-data.csv")
}

function handleDataZoom(event) {
  if (isAdjustingZoom || chartData.value.length < 2) return
  const payload = event.batch ? event.batch[0] : event
  const toIndex = value => {
    if (value == null) return null
    const idx = chartLabels.indexOf(value)
    return idx === -1 ? null : idx
  }
  const toIndexFromPercent = percent => {
    if (percent == null) return null
    const raw = Math.round((percent / 100) * (chartLabels.length - 1))
    return Math.min(Math.max(raw, 0), chartLabels.length - 1)
  }

  let startIndex = toIndex(payload.startValue)
  let endIndex = toIndex(payload.endValue)
  if (startIndex == null) startIndex = toIndexFromPercent(payload.start)
  if (endIndex == null) endIndex = toIndexFromPercent(payload.end)
  if (startIndex == null) startIndex = 0
  if (endIndex == null) endIndex = chartLabels.length - 1

  let newStart = Math.min(startIndex, endIndex)
  let newEnd = Math.max(startIndex, endIndex)
  let startTime = dayjs(chartData.value[newStart].timestamp)
  let endTime = dayjs(chartData.value[newEnd].timestamp)
  if (endTime.diff(startTime) >= MAX_ZOOM_MS) return

  const lastIndex = chartData.value.length - 1
  while (endTime.diff(startTime) < MAX_ZOOM_MS && (newStart > 0 || newEnd < lastIndex)) {
    if (newEnd < lastIndex) {
      newEnd += 1
      endTime = dayjs(chartData.value[newEnd].timestamp)
      if (endTime.diff(startTime) >= MAX_ZOOM_MS) break
    }
    if (newStart > 0) {
      newStart -= 1
      startTime = dayjs(chartData.value[newStart].timestamp)
    } else {
      break
    }
  }

  if (endTime.diff(startTime) < MAX_ZOOM_MS && newStart === 0 && newEnd === lastIndex) return

  isAdjustingZoom = true
  chart.dispatchAction({
    type: "dataZoom",
    startValue: chartLabels[newStart],
    endValue: chartLabels[newEnd],
  })
  isAdjustingZoom = false
}
</script>

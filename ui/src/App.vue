<template>
  <div class="min-h-screen bg-gray-50 flex flex-col items-center py-8 px-4">
    <div class="bg-emerald-50 rounded-xl shadow-lg w-full max-w-6xl p-6">
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

const ranges = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
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
  const labels = chartData.value.map(d => dayjs(d.timestamp).format("MMM DD"))
  const carbon = chartData.value.map(d => d.carbon)
  const fuel = chartData.value.map(d => d.fuel)

  if (!chart) chart = echarts.init(chartRef.value)
  chart.setOption({
    tooltip: { trigger: "axis" },
    legend: { data: ["Carbon savings", "Diesel savings"] },
    toolbox: { feature: { dataZoom: {}, restore: {}, saveAsImage: {} } },
    dataZoom: [{ type: "inside" }, { type: "slider" }],
    xAxis: [{ type: "category", data: labels }],
    yAxis: [
      { type: "value", name: "Carbon (kg)" },
      { type: "value", name: "Fuel (L)", position: "right" },
    ],
    series: [
      { name: "Carbon savings", type: "bar", data: carbon, color: "#10b981" },
      { name: "Diesel savings", type: "bar", data: fuel, color: "#6366f1", yAxisIndex: 1 },
    ],
  })
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

</script>

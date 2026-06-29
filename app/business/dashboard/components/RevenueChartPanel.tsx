import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler)

export default function RevenueChartPanel({
  labels,
  revenueData,
  totalRevenue,
}: {
  labels: string[]
  revenueData: number[]
  totalRevenue: number
}) {
  const revenueChartData = {
    labels,
    datasets: [
      {
        label: 'Revenue',
        data: revenueData,
        tension: 0.42,
        fill: true,
        borderWidth: 3,
        pointRadius: 0,
        pointHoverRadius: 5,
      },
    ],
  }

  const revenueChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#020617',
        titleColor: '#ffffff',
        bodyColor: '#cbd5e1',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        padding: 14,
        callbacks: {
          label: (context: any) => `Revenue: £${context.raw}`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(255,255,255,0.04)' },
        ticks: { color: '#64748b', maxRotation: 0, autoSkip: true, maxTicksLimit: 8 },
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(255,255,255,0.06)' },
        ticks: {
          color: '#64748b',
          callback: (value: any) => `£${value}`,
        },
      },
    },
  }

  return (
    <section className="overflow-hidden rounded-[3rem] border border-white/10 bg-[#07111f] p-8 shadow-[0_60px_200px_rgba(0,0,0,.45)]">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-bold text-cyan-300">Revenue</p>
          <h2 className="mt-2 text-3xl font-black tracking-[-0.04em]">Last 30 days</h2>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-black text-slate-300">
          Total £{totalRevenue}
        </div>
      </div>

      <div className="h-[340px]">
        <Line data={revenueChartData} options={revenueChartOptions} />
      </div>
    </section>
  )
}

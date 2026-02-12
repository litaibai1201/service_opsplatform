import React, { useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartOptions,
  ChartData,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// 注册 Chart.js 组件
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export interface AreaChartProps {
  data: ChartData<'line'>;
  options?: ChartOptions<'line'>;
  height?: number;
  className?: string;
  title?: string;
  loading?: boolean;
  stacked?: boolean;
}

const AreaChart: React.FC<AreaChartProps> = ({
  data,
  options,
  height = 300,
  className = '',
  title,
  loading = false,
  stacked = false,
}) => {
  const chartRef = useRef<ChartJS<'line'>>(null);

  // 为数据集添加填充效果
  const areaData: ChartData<'line'> = {
    ...data,
    datasets: data.datasets.map((dataset, index) => ({
      ...dataset,
      fill: true,
      tension: 0.4, // 平滑曲线
      backgroundColor: dataset.backgroundColor || `rgba(59, 130, 246, ${0.2 - index * 0.05})`,
      borderColor: dataset.borderColor || '#3b82f6',
      borderWidth: 2,
      pointBackgroundColor: dataset.pointBackgroundColor || '#fff',
      pointBorderColor: dataset.borderColor || '#3b82f6',
      pointBorderWidth: 2,
      pointRadius: 3,
      pointHoverRadius: 5,
    })),
  };

  const defaultOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 15,
          font: {
            size: 12,
            family: "'Inter', sans-serif",
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleFont: {
          size: 14,
          weight: 'bold',
        },
        bodyFont: {
          size: 13,
        },
        bodySpacing: 6,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          label: function (context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += context.parsed.y.toLocaleString();
            }
            return label;
          },
        },
      },
    },
    scales: {
      x: {
        stacked: stacked,
        grid: {
          display: false,
        },
        ticks: {
          font: {
            size: 11,
          },
        },
      },
      y: {
        stacked: stacked,
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
          drawBorder: false,
        },
        ticks: {
          font: {
            size: 11,
          },
          callback: function (value) {
            return value.toLocaleString();
          },
        },
      },
    },
  };

  // 合并选项
  const mergedOptions: ChartOptions<'line'> = {
    ...defaultOptions,
    ...options,
    plugins: {
      ...defaultOptions.plugins,
      ...options?.plugins,
    },
    scales: {
      ...defaultOptions.scales,
      ...options?.scales,
    },
  };

  useEffect(() => {
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, []);

  if (loading) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-50 rounded-lg ${className}`}
        style={{ height: `${height}px` }}
      >
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-sm text-gray-500">加载图表数据...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      {title && (
        <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
      )}
      <div style={{ height: `${height}px` }}>
        <Line ref={chartRef} data={areaData} options={mergedOptions} />
      </div>
    </div>
  );
};

export default AreaChart;

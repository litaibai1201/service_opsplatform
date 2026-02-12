import React, { useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
  ChartData,
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

// 注册 Chart.js 组件
ChartJS.register(ArcElement, Title, Tooltip, Legend);

export interface DonutChartProps {
  data: ChartData<'doughnut'>;
  options?: ChartOptions<'doughnut'>;
  height?: number;
  className?: string;
  title?: string;
  loading?: boolean;
  showLegend?: boolean;
  centerText?: {
    label: string;
    value: string | number;
  };
}

const DonutChart: React.FC<DonutChartProps> = ({
  data,
  options,
  height = 300,
  className = '',
  title,
  loading = false,
  showLegend = true,
  centerText,
}) => {
  const chartRef = useRef<ChartJS<'doughnut'>>(null);

  const defaultOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%', // 内圆半径，使其成为环形图
    plugins: {
      legend: {
        display: showLegend,
        position: 'right',
        labels: {
          usePointStyle: true,
          padding: 15,
          font: {
            size: 12,
            family: "'Inter', sans-serif",
          },
          generateLabels: (chart) => {
            const data = chart.data;
            if (data.labels && data.datasets.length) {
              return data.labels.map((label, i) => {
                const dataset = data.datasets[0];
                const value = dataset.data[i] as number;
                const total = (dataset.data as number[]).reduce((a, b) => a + b, 0);
                const percentage = ((value / total) * 100).toFixed(1);

                return {
                  text: `${label}: ${percentage}%`,
                  fillStyle: Array.isArray(dataset.backgroundColor)
                    ? (dataset.backgroundColor[i] as string)
                    : (dataset.backgroundColor as string),
                  hidden: false,
                  index: i,
                };
              });
            }
            return [];
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
        cornerRadius: 8,
        callbacks: {
          label: function (context) {
            const label = context.label || '';
            const value = context.parsed as number;
            const total = (context.dataset.data as number[]).reduce((a, b) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value.toLocaleString()} (${percentage}%)`;
          },
        },
      },
    },
  };

  // 合并选项
  const mergedOptions: ChartOptions<'doughnut'> = {
    ...defaultOptions,
    ...options,
    plugins: {
      ...defaultOptions.plugins,
      ...options?.plugins,
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
      <div className="relative" style={{ height: `${height}px` }}>
        <Doughnut ref={chartRef} data={data} options={mergedOptions} />

        {/* 中心文字 */}
        {centerText && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <p className="text-sm text-gray-500 font-medium">{centerText.label}</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">
              {typeof centerText.value === 'number'
                ? centerText.value.toLocaleString()
                : centerText.value}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DonutChart;

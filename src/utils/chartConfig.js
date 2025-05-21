import { TOTAL_EARTHQUAKES } from './mockData'

// 震级图例配置
export const magnitudeLegend = [
  { color: '#313695', label: '< 3.0' },
  { color: '#4575b4', label: '3.0-4.0' },
  { color: '#74add1', label: '4.0-5.0' },
  { color: '#abd9e9', label: '5.0-6.0' },
  { color: '#fdae61', label: '6.0-7.0' },
  { color: '#f46d43', label: '7.0-8.0' },
  { color: '#d73027', label: '> 8.0' },
]

// 获取图表配置选项
export function getChartOptions(isMobile, subtextContent = '数据加载中...') {
  const mobileOptions = isMobile
    ? {
        title: {
          top: 10,
          textStyle: { fontSize: 16 },
          subtextStyle: { fontSize: 10 },
        },
        visualMap: [
          {
            right: 10,
            textStyle: { fontSize: 10 },
          },
        ],
        globe: {
          viewControl: {
            distance: 2,
            targetCoord: [110, 20],
          },
        },
        series: [
          {
            symbolSize: 4, // 移动端点更大更容易看清
            progressive: 10000, // 降低渐进渲染阈值提高性能
            progressiveThreshold: 3000,
          },
        ],
      }
    : {}

  return {
    backgroundColor: '#000',
    title: {
      text: '全球地震活动可视化 (模拟数据)',
      subtext: subtextContent,
      left: 'center',
      top: 20,
      textStyle: {
        color: '#fff',
        fontSize: 20,
      },
      subtextStyle: {
        color: '#ccc',
      },
      ...mobileOptions.title,
    },
    tooltip: {
      formatter: function (params) {
        return `
          <div style="font-weight:bold;margin-bottom:5px;">
            ${params.value[6]} 地震
          </div>
          <div>位置: ${params.value[1].toFixed(2)}°, ${params.value[0].toFixed(2)}°</div>
          <div>深度: ${Math.abs(params.value[2]).toFixed(1)} km</div>
          <div>震级: ${params.value[7]}</div>
        `
      },
    },
    visualMap: [
      {
        type: 'continuous',
        text: ['强', '弱'],
        right: 30,
        dimension: 4, // 将第5个维度映射到颜色
        min: 0.25,
        max: 1,
        textStyle: {
          color: '#fff',
        },
        inRange: {
          color: [
            '#313695',
            '#4575b4',
            '#74add1',
            '#abd9e9',
            '#fdae61',
            '#f46d43',
            '#d73027',
            '#a50026',
          ],
        },
        ...mobileOptions.visualMap?.[0],
      },
    ],
    globe: {
      environment: '#000',
      baseColor: '#000', // 使用纯色替代纹理
      shading: 'color', // 使用简单着色模式
      displacementScale: 0,
      displacementQuality: 'medium',
      realisticMaterial: {
        roughness: 0.8,
        metalness: 0,
      },
      postEffect: {
        enable: !isMobile, // 移动端禁用后期效果提升性能
        bloom: {
          enable: !isMobile,
          bloomIntensity: 0.2,
        },
        SSAO: {
          enable: !isMobile,
          quality: 'medium',
          radius: 2,
        },
      },
      temporalSuperSampling: {
        enable: !isMobile, // 移动端禁用超采样
      },
      light: {
        ambient: {
          intensity: 0.3,
        },
        main: {
          intensity: 2.0,
          shadow: !isMobile, // 移动端禁用阴影提升性能
        },
      },
      viewControl: {
        autoRotate: false,
        autoRotateSpeed: 5,
        alpha: 30,
        beta: 160,
        targetCoord: [110, 20],
        distance: 1.8,
        ...mobileOptions.globe?.viewControl,
      },
    },
    series: [
      {
        type: 'scatter3D',
        coordinateSystem: 'globe',
        blendMode: 'lighter',
        symbolSize: 3.5, // 增大点的大小使其更明显
        progressive: 20000,
        progressiveThreshold: 50000,
        itemStyle: {
          opacity: 0.7, // 增加不透明度
        },
        dimensions: [
          'lng',
          'lat',
          'depth',
          'magnitude',
          'magnitudeNorm',
          'timestamp',
          'date',
          'magnitudeLabel',
        ],
        data: [],
        animation: false,
        emphasis: {
          itemStyle: {
            opacity: 0.9,
            borderWidth: 1,
            borderColor: '#fff',
          },
        },
        encode: {
          tooltip: [6, 7, 2],
        },
        ...mobileOptions.series?.[0],
      },
    ],
  }
}

// 更新图表标题的加载进度
export function updateLoadingProgress(chart, totalEarthquakes, progress) {
  chart.setOption({
    title: {
      subtext: `数据加载: ${totalEarthquakes.toLocaleString()} / ${TOTAL_EARTHQUAKES.toLocaleString()} (${progress}%)`,
    },
  })
}

// 更新图表数据
export function updateChartData(chart, filteredData) {
  chart.setOption({
    series: [
      {
        data: filteredData,
      },
    ],
  })
}

// 设置加载完成后的副标题
export function setLoadedSubtitle(chart) {
  chart.setOption({
    title: {
      subtext: '拖动时间轴或点击播放来查看地震演变',
    },
  })
}

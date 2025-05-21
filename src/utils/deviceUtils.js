// 检测是否为移动设备
export function isMobileDevice() {
  if (typeof navigator === 'undefined') return false

  const userAgent = navigator.userAgent || navigator.vendor || window.opera
  return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
    userAgent.toLowerCase(),
  )
}

// 处理窗口大小变化
export function handleResize(chart, isMobileRef) {
  const wasMobile = isMobileRef.value
  isMobileRef.value = isMobileDevice()

  // 只有在移动状态变化时才需要重新配置图表
  const needsReconfigure = wasMobile !== isMobileRef.value

  // 调整图表大小
  chart && chart.resize()

  return needsReconfigure
}

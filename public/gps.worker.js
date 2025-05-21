self.onmessage = function (e) {
  const { action, rawData, viewRect, lodLevel } = e.data

  if (action === 'process') {
    const filtered = rawData.filter(([lng, lat]) => {
      return (
        lng >= viewRect.minLng &&
        lng <= viewRect.maxLng &&
        lat >= viewRect.minLat &&
        lat <= viewRect.maxLat
      )
    })

    // 简单的 LOD 降采样（每隔 lodLevel 个点取一个）
    const downSampled = filtered.filter((_, i) => i % lodLevel === 0)

    self.postMessage({ data: downSampled })
  }
}

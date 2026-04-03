/**
 * Dừng mọi track camera/audio gắn với thẻ <video> trong phạm vi (thường là preview quét).
 * Gọi khi thoát màn hình quét để tránh camera vẫn bật sau khi unmount.
 */
export function stopAllVideoElementStreams(scope: ParentNode = document): void {
  try {
    scope.querySelectorAll('video').forEach((video) => {
      const raw = video.srcObject
      if (raw instanceof MediaStream) {
        raw.getTracks().forEach((t) => t.stop())
      }
      video.srcObject = null
    })
  } catch {
    /* ignore */
  }
}

export function stopAllVideoStreamsUnderRoot(): void {
  const root = document.getElementById('root')
  if (root) stopAllVideoElementStreams(root)
}

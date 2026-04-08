export async function registerSerwist() {
  try {
    const { getSerwist } = await import('virtual:serwist')
    const s = await getSerwist()
    void s?.register()
  } catch {
    // ignore SW errors in production; app vẫn hoạt động bình thường
  }
}


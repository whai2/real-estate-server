import Property from '../models/Property';

const AUTO_HIDE_DAYS = 30;

export async function runAutoHideCheck() {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - AUTO_HIDE_DAYS);

  const result = await Property.updateMany(
    {
      status: 'active',
      lastRefreshedAt: { $lte: cutoffDate },
    },
    {
      $set: { status: 'autoHide' },
    }
  );

  if (result.modifiedCount > 0) {
    console.log(`[AutoHide] ${result.modifiedCount}건 자동숨김 처리`);
  }
}

// 매 시간마다 체크 (서버 실행 시 시작)
export function startAutoHideScheduler() {
  // 즉시 1회 실행
  runAutoHideCheck().catch(console.error);

  // 이후 1시간마다 반복
  setInterval(() => {
    runAutoHideCheck().catch(console.error);
  }, 60 * 60 * 1000);

  console.log('[AutoHide] 스케줄러 시작 (1시간 간격)');
}

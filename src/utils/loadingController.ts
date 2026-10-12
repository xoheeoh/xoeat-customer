let setLoadingFunc: ((loading: boolean) => void) | null = null;
let loadingStartTime: number | null = null;
/** 최소 표시 시간을 채우려고 걸어 둔 "끄기" 타이머. 그 사이 다시 start() 되면 취소해야 새 로딩이 바로 꺼지지 않는다 */
let stopTimer: ReturnType<typeof setTimeout> | null = null;

const MIN_LOADING_DURATION = 300; // 최소 0.3초 유지

const clearStopTimer = () => {
  if (stopTimer) {
    clearTimeout(stopTimer);
    stopTimer = null;
  }
};

export const loadingController = {
  register: (fn: (loading: boolean) => void) => {
    setLoadingFunc = fn;
  },
  start: () => {
    clearStopTimer();
    loadingStartTime = Date.now();
    setLoadingFunc?.(true);
  },
  stop: () => {
    const now = Date.now();
    const off = () => {
      setLoadingFunc?.(false);
      loadingStartTime = null;
      stopTimer = null;
    };

    if (loadingStartTime) {
      const elapsed = now - loadingStartTime;
      if (elapsed < MIN_LOADING_DURATION) {
        clearStopTimer();
        stopTimer = setTimeout(off, MIN_LOADING_DURATION - elapsed);
        return;
      }
    }
    off();
  },
};

// iPhone/iPad (anche gli iPad che si presentano come Mac)
export const IOS =
  /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

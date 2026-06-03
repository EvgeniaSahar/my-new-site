/** scale-down-fade from animate-text skill (scaled for site parity). */
const Y_TRAVEL_MULTIPLIER = 0.58
const SPEED_MULTIPLIER = 0.72

export const scaleDownFadeDigitVariants = {
  initial: {
    opacity: 0,
    y: 8 * Y_TRAVEL_MULTIPLIER,
    scale: 1.04,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: (520 * SPEED_MULTIPLIER) / 1000,
      ease: [0.22, 1, 0.36, 1],
    },
  },
  exit: {
    opacity: 0,
    y: -8 * Y_TRAVEL_MULTIPLIER,
    scale: 0.94,
    transition: {
      duration: (380 * SPEED_MULTIPLIER) / 1000,
      ease: [0.64, 0, 0.78, 0],
    },
  },
}

/**
 * Animation utilities and variants for Framer Motion
 */

export const transitions = {
  // Spring animations
  spring: {
    type: "spring",
    damping: 20,
    stiffness: 300
  },
  springBouncy: {
    type: "spring",
    damping: 15,
    stiffness: 400
  },
  springSmooth: {
    type: "spring",
    damping: 30,
    stiffness: 200
  },

  // Easing animations
  easeOut: {
    type: "tween",
    ease: "easeOut",
    duration: 0.3
  },
  easeInOut: {
    type: "tween",
    ease: "easeInOut",
    duration: 0.4
  }
}

export const animations = {
  // Fade animations
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 }
  },

  // Slide animations
  slideUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  },
  slideDown: {
    initial: { opacity: 0, y: -20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 }
  },
  slideLeft: {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 }
  },
  slideRight: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 }
  },

  // Scale animations
  scale: {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.9 }
  },
  scaleUp: {
    initial: { opacity: 0, scale: 0.8 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 1.1 }
  },

  // Pop animation
  pop: {
    initial: { scale: 0, opacity: 0 },
    animate: {
      scale: 1,
      opacity: 1,
      transition: transitions.springBouncy
    },
    exit: { scale: 0, opacity: 0 }
  },

  // Rotate animation
  rotate: {
    initial: { opacity: 0, rotate: -180 },
    animate: { opacity: 1, rotate: 0 },
    exit: { opacity: 0, rotate: 180 }
  }
}

// Stagger children animations
export const staggerContainer = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.3
    }
  }
}

export const staggerItem = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 }
}

// Page transition variants
export const pageTransition = {
  initial: { opacity: 0, x: -20 },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.3,
      ease: "easeOut"
    }
  },
  exit: {
    opacity: 0,
    x: 20,
    transition: {
      duration: 0.2,
      ease: "easeIn"
    }
  }
}

// Card hover animations
export const cardHover = {
  rest: {
    scale: 1,
    boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)"
  },
  hover: {
    scale: 1.02,
    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
    transition: transitions.spring
  },
  tap: {
    scale: 0.98
  }
}

// Button animations
export const buttonVariants = {
  rest: { scale: 1 },
  hover: { scale: 1.05 },
  tap: { scale: 0.95 }
}

// Notification animations
export const notificationVariants = {
  initial: {
    opacity: 0,
    y: 50,
    scale: 0.3
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: transitions.spring
  },
  exit: {
    opacity: 0,
    scale: 0.5,
    transition: { duration: 0.2 }
  }
}

// Chart animations
export const chartAnimations = {
  container: {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  },
  item: {
    initial: { opacity: 0, y: 20 },
    animate: {
      opacity: 1,
      y: 0,
      transition: transitions.easeOut
    }
  }
}

// Loading animations
export const loadingDots = {
  initial: { y: 0 },
  animate: {
    y: -10,
    transition: {
      duration: 0.5,
      repeat: Infinity,
      repeatType: "reverse" as const,
      ease: "easeInOut"
    }
  }
}

// Success animation
export const successCheckmark = {
  initial: { pathLength: 0, opacity: 0 },
  animate: {
    pathLength: 1,
    opacity: 1,
    transition: {
      duration: 0.5,
      ease: "easeOut"
    }
  }
}

// Number counter animation
export const counterAnimation = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut"
    }
  }
}

// Skeleton loading animation
export const skeletonPulse = {
  animate: {
    backgroundPosition: ["200% 0", "-200% 0"],
    transition: {
      duration: 1.5,
      ease: "linear",
      repeat: Infinity
    }
  }
}

// Modal/Dialog animations
export const modalVariants = {
  overlay: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 }
  },
  content: {
    initial: { opacity: 0, scale: 0.95, y: 20 },
    animate: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: transitions.spring
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      y: 20,
      transition: transitions.easeOut
    }
  }
}

// Tab animations
export const tabContentVariants = {
  initial: { opacity: 0, x: -10 },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.2,
      ease: "easeOut"
    }
  },
  exit: {
    opacity: 0,
    x: 10,
    transition: {
      duration: 0.15,
      ease: "easeIn"
    }
  }
}

'use client'

import React from 'react'

import { usePathname } from 'next/navigation'

import { motion } from 'framer-motion'

const variants = {
  hidden: { opacity: 0 },
  enter: { opacity: 1 },
}

// ページ遷移用アニメーション
export const PageTransitionAnimation: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname()
  return (
    <motion.div
      key={pathname}
      className="h-full w-full"
      variants={variants}
      initial="hidden"
      animate="enter"
      transition={{
        type: 'linear',
        duration: 0.5,
      }}
    >
      {children}
    </motion.div>
  )
}

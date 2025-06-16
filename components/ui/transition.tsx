"use client"

import { motion, AnimatePresence } from "framer-motion"
import { ReactNode } from "react"

interface TransitionProps {
  children: ReactNode
  show?: boolean
}

export function FadeIn({ children, show = true }: TransitionProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

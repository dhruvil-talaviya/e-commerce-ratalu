"use client";

import { motion, type Variants, useReducedMotion } from "motion/react";
import * as React from "react";

type Direction = "up" | "down" | "left" | "right" | "none";

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  /** Direction the element travels from as it fades in. */
  direction?: Direction;
  delay?: number;
  /** Distance in px to travel. */
  distance?: number;
  duration?: number;
  once?: boolean;
  as?: "div" | "section" | "li" | "span";
}

const offset: Record<Direction, { x?: number; y?: number }> = {
  up: { y: 1 },
  down: { y: -1 },
  left: { x: 1 },
  right: { x: -1 },
  none: {},
};

/**
 * A drop-in wrapper that fades + slides its children into view on scroll,
 * respecting reduced-motion preferences.
 */
export function Reveal({
  children,
  className,
  direction = "up",
  delay = 0,
  distance = 28,
  duration = 0.7,
  once = true,
  as = "div",
}: RevealProps) {
  const reduce = useReducedMotion();
  const o = offset[direction];

  const variants: Variants = {
    hidden: {
      opacity: 0,
      x: reduce ? 0 : (o.x ?? 0) * distance,
      y: reduce ? 0 : (o.y ?? 0) * distance,
    },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: { duration, delay, ease: [0.22, 1, 0.36, 1] },
    },
  };

  const MotionTag = motion[as];

  return (
    <MotionTag
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, margin: "-80px" }}
    >
      {children}
    </MotionTag>
  );
}

/** Stagger container: children animate in sequence. */
export function RevealGroup({
  children,
  className,
  stagger = 0.09,
  once = true,
  as = "div",
}: {
  children: React.ReactNode;
  className?: string;
  stagger?: number;
  once?: boolean;
  as?: "div" | "ul";
}) {
  const MotionTag = motion[as];
  return (
    <MotionTag
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, margin: "-60px" }}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: stagger } },
      }}
    >
      {children}
    </MotionTag>
  );
}

/** Child item for use inside RevealGroup. */
export function RevealItem({
  children,
  className,
  distance = 24,
  as = "div",
}: {
  children: React.ReactNode;
  className?: string;
  distance?: number;
  as?: "div" | "li";
}) {
  const reduce = useReducedMotion();
  const MotionTag = motion[as];
  return (
    <MotionTag
      className={className}
      variants={{
        hidden: { opacity: 0, y: reduce ? 0 : distance },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
        },
      }}
    >
      {children}
    </MotionTag>
  );
}

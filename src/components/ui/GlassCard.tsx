import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for merging classes
function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface GlassCardProps extends HTMLMotionProps<"div"> {
    variant?: 'blur' | 'opaque';
    className?: string;
    children: React.ReactNode;
}

const GlassCard: React.FC<GlassCardProps> = ({
    variant = 'opaque', // Default to opaque for performance
    className,
    children,
    ...props
}) => {

    const variants = {
        blur: "backdrop-blur-xl bg-card-bg/60 border border-card-border shadow-xl",
        opaque: "bg-card-bg border border-card-border/50 shadow-sm backdrop-blur-[0px]"
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={cn(
                "rounded-2xl transition-all duration-300",
                variants[variant],
                className
            )}
            {...props}
        >
            {children}
        </motion.div>
    );
};

export default GlassCard;

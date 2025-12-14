import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PageTransitionProps {
    children: React.ReactNode;
    direction?: 'left' | 'right' | 'up' | 'down' | 'fade';
    className?: string;
}

const PageTransition: React.FC<PageTransitionProps> = ({
    children,
    direction = 'left',
    className = ''
}) => {
    // Define slide directions with variant functions to handle dynamic exit direction
    const variants = {
        hidden: (dir: string) => ({
            opacity: 0,
            x: dir === 'fade' ? 0 : dir === 'left' ? '100%' : dir === 'right' ? '-100%' : 0,
            y: dir === 'fade' ? 0 : dir === 'up' ? '100%' : dir === 'down' ? '-100%' : 0,
        }),
        visible: {
            opacity: 1,
            x: 0,
            y: 0,
        },
        exit: (dir: string) => ({
            opacity: 0,
            x: dir === 'fade' ? 0 : dir === 'left' ? '-100%' : dir === 'right' ? '100%' : 0,
            y: dir === 'fade' ? 0 : dir === 'up' ? '-100%' : dir === 'down' ? '100%' : 0,
        }),
    };

    return (
        <motion.div
            custom={direction}
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={variants}
            transition={{
                type: 'spring',
                stiffness: 300,
                damping: 30,
                mass: 0.8,
            }}
            className={className}
        >
            {children}
        </motion.div>
    );
};

export default PageTransition;

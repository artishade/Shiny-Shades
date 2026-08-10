import { motion, AnimatePresence } from 'framer-motion';
import { useLoadingStore } from '../../store/useLoadingStore';
import { memo } from 'react';

export const FullScreenLoader = memo(() => {
    const { isLoading, message } = useLoadingStore();

    return (
        <AnimatePresence>
            {isLoading && (
                <motion.div
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0, transition: { duration: 0.8, ease: "easeInOut" } }}
                    className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white"
                >
                    {/* Logo Area */}
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="text-4xl font-serif font-bold tracking-widest mb-8"
                    > </motion.div>

                    {/* Uiverse Loader */}
                    <div className="loader">
                        <span className="loader-text">LOADING</span>
                        <span className="load"></span>
                    </div>

                    {/* Message Text */}
                    <motion.p
                        className="mt-12 text-sm font-light tracking-tighter uppercase text-gray-400"
                        key={message}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                    >
                        {message}
                    </motion.p>
                </motion.div>
            )}
        </AnimatePresence>
    );
});
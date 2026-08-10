import { useRef, useCallback, useEffect } from 'react';

export function useAutoScroll(
    itemCount: number,
    cardWidth: number,
    speed: number,
    reverse: boolean = false
) {
    const trackRef = useRef<HTMLDivElement>(null);
    const animFrameRef = useRef<number>(0);
    const positionRef = useRef(0);
    const isPausedRef = useRef(false);

    const animate = useCallback(() => {
        if (!trackRef.current || isPausedRef.current) {
            animFrameRef.current = requestAnimationFrame(animate);
            return;
        }

        const totalWidth = cardWidth * itemCount;

        if (reverse) {
            positionRef.current -= speed;
            if (positionRef.current <= 0) {
                positionRef.current += totalWidth;
            }
        } else {
            positionRef.current += speed;
            if (positionRef.current >= totalWidth) {
                positionRef.current -= totalWidth;
            }
        }

        trackRef.current.style.transform = `translateX(-${positionRef.current}px)`;
        animFrameRef.current = requestAnimationFrame(animate);
    }, [itemCount, cardWidth, speed, reverse]);

    useEffect(() => {
        if (itemCount === 0) return;
        positionRef.current = reverse ? cardWidth * itemCount : 0;
        animFrameRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animFrameRef.current);
    }, [animate, itemCount, reverse, cardWidth]);

    const handlePrev = () => {
        isPausedRef.current = true;
        const totalWidth = cardWidth * itemCount;
        positionRef.current -= cardWidth;
        if (positionRef.current < 0) positionRef.current += totalWidth;
        if (trackRef.current) {
            trackRef.current.style.transition = 'transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            trackRef.current.style.transform = `translateX(-${positionRef.current}px)`;
        }
        setTimeout(() => {
            if (trackRef.current) trackRef.current.style.transition = 'none';
            isPausedRef.current = false;
        }, 700);
    };

    const handleNext = () => {
        isPausedRef.current = true;
        positionRef.current += cardWidth;
        if (trackRef.current) {
            trackRef.current.style.transition = 'transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            trackRef.current.style.transform = `translateX(-${positionRef.current}px)`;
        }
        setTimeout(() => {
            if (trackRef.current) trackRef.current.style.transition = 'none';
            isPausedRef.current = false;
        }, 700);
    };

    return { trackRef, isPausedRef, handlePrev, handleNext };
}

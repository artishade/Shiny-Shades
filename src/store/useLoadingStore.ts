import { create } from 'zustand';

interface LoadingState {
    progress: number;
    message: string;
    isLoading: boolean;
    setLoading: (status: boolean, progress?: number, message?: string) => void;
}

export const useLoadingStore = create<LoadingState>((set) => ({
    progress: 0,
    message: 'Initializing...',
    isLoading: true,
    setLoading: (status, progress = 0, message = 'Loading...') =>
        set({ isLoading: status, progress, message }),
}));
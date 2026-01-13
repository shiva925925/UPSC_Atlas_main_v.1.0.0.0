import React from 'react';

const BackgroundGradient: React.FC = () => {
    return (
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-app-bg transition-colors duration-500">
            {/* Top Left Blob */}
            <div
                className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full opacity-20 dark:opacity-10 blur-[100px] transition-opacity duration-500"
                style={{ backgroundColor: '#60A5FA' }} // Blue-400
            ></div>

            {/* Bottom Right Blob */}
            <div
                className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full opacity-15 dark:opacity-5 blur-[100px] transition-opacity duration-500"
                style={{ backgroundColor: '#A78BFA' }} // Purple-400
            ></div>

            {/* Center Blob */}
            <div
                className="absolute top-[40%] left-[30%] w-[40%] h-[40%] rounded-full opacity-10 dark:opacity-5 blur-[120px] transition-opacity duration-500"
                style={{ backgroundColor: '#34D399' }} // Emerald-400
            ></div>
        </div>
    );
};

export default BackgroundGradient;

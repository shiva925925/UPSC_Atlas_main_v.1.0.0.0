import React from 'react';

const BackgroundGradient: React.FC = () => {
    return (
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-gray-50">
            {/* Top Left Blob */}
            <div
                className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full opacity-40 blur-[100px]"
                style={{ backgroundColor: '#60A5FA' }} // Blue-400
            ></div>

            {/* Bottom Right Blob */}
            <div
                className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full opacity-30 blur-[100px]"
                style={{ backgroundColor: '#A78BFA' }} // Purple-400
            ></div>

            {/* Center Blob */}
            <div
                className="absolute top-[40%] left-[30%] w-[40%] h-[40%] rounded-full opacity-20 blur-[120px]"
                style={{ backgroundColor: '#34D399' }} // Emerald-400
            ></div>
        </div>
    );
};

export default BackgroundGradient;

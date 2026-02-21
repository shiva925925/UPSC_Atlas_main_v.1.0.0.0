import React from 'react';

interface PremiumStarProps {
    isStarred: boolean;
    onClick?: (e: React.MouseEvent) => void;
    size?: number;
    className?: string;
}

const PremiumStar: React.FC<PremiumStarProps> = ({ isStarred, onClick, size = 24, className = "" }) => {
    return (
        <button
            onClick={onClick}
            className={`relative flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 ${className}`}
            style={{ width: size, height: size }}
            title={isStarred ? "Remove from Favorites" : "Add to Favorites"}
        >
            <svg
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className={`w-full h-full transition-all duration-500 ${isStarred ? 'drop-shadow-[0_0_8px_rgba(37,99,235,0.6)]' : 'opacity-40 grayscale hover:opacity-100'}`}
            >
                {/* The "Overlapping S" Shape */}
                <path
                    d="M16 6C16 4.34315 14.6569 3 13 3H11C7.68629 3 5 5.68629 5 9C5 10.6569 6.34315 12 8 12H16C17.6569 12 19 13.3431 19 15C19 18.3137 16.3137 21 13 21H11C9.34315 21 8 19.6569 8 18"
                    stroke={isStarred ? "#2563eb" : "currentColor"}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />

                {/* Two small white stars */}
                {isStarred && (
                    <>
                        <path
                            d="M13 6.5L13.5 8H15L13.8 9L14.2 10.5L13 9.6L11.8 10.5L12.2 9L11 8H12.5L13 6.5Z"
                            fill="white"
                        />
                        <path
                            d="M11 14.5L11.5 16H13L11.8 17L12.2 18.5L11 17.6L9.8 18.5L10.2 17L9 16H10.5L11 14.5Z"
                            fill="white"
                        />
                    </>
                )}
            </svg>
        </button>
    );
};

export default PremiumStar;

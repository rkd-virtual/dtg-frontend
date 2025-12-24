"use client";


import React from "react";


export function Spinner({ size = 20, className = "", ariaLabel = "Loading" }: { size?: number; className?: string; ariaLabel?: string }) {
const stroke = Math.max(2, Math.floor(size / 8));
const half = size / 2;
const radius = half - stroke;
const circumference = 2 * Math.PI * radius;


return (
<svg
role="img"
aria-label={ariaLabel}
width={size}
height={size}
viewBox={`0 0 ${size} ${size}`}
className={`animate-spin ${className}`}
>
<circle
cx={half}
cy={half}
r={radius}
strokeWidth={stroke}
strokeOpacity="0.15"
stroke="currentColor"
fill="none"
/>
<path
d={`M ${half} ${stroke} A ${radius} ${radius} 0 0 1 ${half + radius} ${half}`}
strokeWidth={stroke}
strokeLinecap="round"
stroke="currentColor"
fill="none"
/>
</svg>
);
}


export default Spinner;
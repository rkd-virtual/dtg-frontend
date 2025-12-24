"use client";


import React from "react";


type ItemProps = React.HTMLAttributes<HTMLDivElement> & {
variant?: "default" | "muted" | "accent";
children?: React.ReactNode;
};


export function Item({ variant = "default", className = "", children, ...rest }: ItemProps) {
const base = "flex items-center gap-3 p-3 rounded-lg border bg-white";
const variants: Record<string, string> = {
default: "border-gray-100",
muted: "border-gray-100 bg-muted/40 text-muted-foreground",
accent: "border-indigo-100 bg-indigo-50",
};


const cls = `${base} ${variants[variant] || variants.default} ${className}`;


return (
<div className={cls} {...rest}>
{children}
</div>
);
}


// small layout helpers to match the demo usage
export function ItemMedia({ children, className = "flex-none" }: { children?: React.ReactNode; className?: string }) {
return <div className={`w-10 h-10 flex items-center justify-center ${className}`}>{children}</div>;
}


export function ItemContent({ children, className = "flex-1" }: { children?: React.ReactNode; className?: string }) {
return <div className={className}>{children}</div>;
}


export function ItemTitle({ children, className = "text-sm font-medium" }: { children?: React.ReactNode; className?: string }) {
return <div className={className}>{children}</div>;
}


// default export for convenience
export default Item;
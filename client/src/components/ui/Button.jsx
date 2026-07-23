import React, { useCallback } from 'react';
import Spinner from './Spinner';

const variants = {
    primary: 'bg-gradient-to-r from-[#2563EB] to-[#6366F1] text-white hover:from-[#1D4ED8] hover:to-[#4F46E5]',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-sm',
    danger: 'bg-gradient-to-r from-[#DC2626] to-[#E11D48] text-white hover:from-[#B91C1C] hover:to-[#BE123C]',
    ghost: 'bg-transparent text-gray-600 hover:bg-gray-100',
    ai: 'bg-gradient-to-r from-[#7C3AED] to-[#2563EB] text-white hover:from-[#6D28D9] hover:to-[#1D4ED8]',
    success: 'bg-gradient-to-r from-[#059669] to-[#10B981] text-white hover:from-[#047857] hover:to-[#059669]',
    warning: 'bg-gradient-to-r from-[#F59E0B] to-[#F97316] text-white hover:from-[#D97706] hover:to-[#EA580C]',
    emergency: 'bg-gradient-to-r from-[#EF4444] to-[#DC2626] text-white hover:from-[#DC2626] hover:to-[#B91C1C] animate-pulse-cta',
};

const sizes = {
    sm: 'px-3 py-2 text-xs rounded-[14px]',
    md: 'px-4 py-2.5 text-sm rounded-[14px]',
    lg: 'px-5 py-3 text-base rounded-[14px]',
};

const Button = ({
    children,
    variant = 'primary',
    size = 'md',
    loading = false,
    className = '',
    onClick,
    ...props
}) => {
    const handleClick = useCallback((e) => {
        const btn = e.currentTarget;
        btn.classList.add('animate-ripple');
        const cleanup = () => btn.classList.remove('animate-ripple');
        btn.addEventListener('animationend', cleanup, { once: true });
        onClick?.(e);
    }, [onClick]);

    return (
        <button
            type="button"
            disabled={loading || props.disabled}
            onClick={handleClick}
            className={`
                inline-flex items-center justify-center gap-2 font-semibold 
                transition-all duration-200 ease-out
                active:scale-[0.97] hover:-translate-y-0.5
                ${variants[variant] || variants.primary} 
                ${sizes[size] || sizes.md} 
                ${loading || props.disabled ? 'opacity-60 cursor-not-allowed' : 'shadow-md hover:shadow-lg'}
                ${className}
            `.trim()}
            {...props}
        >
            {loading && <Spinner size="sm" />}
            {children}
        </button>
    );
};

export default Button;

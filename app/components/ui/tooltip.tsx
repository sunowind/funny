import React, { useState } from 'react';

interface TooltipProps {
  children: React.ReactNode;
}

interface TooltipTriggerProps {
  asChild?: boolean;
  children: React.ReactNode;
}

interface TooltipContentProps {
  children: React.ReactNode;
}

// Context for tooltip state
const TooltipContext = React.createContext<{
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}>({
  isOpen: false,
  setIsOpen: () => {},
});

export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}

export function Tooltip({ children }: TooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <TooltipContext.Provider value={{ isOpen, setIsOpen }}>
      <div className="relative inline-block">
        {children}
      </div>
    </TooltipContext.Provider>
  );
}

export function TooltipTrigger({ asChild, children }: TooltipTriggerProps) {
  const { setIsOpen } = React.useContext(TooltipContext);

  const triggerProps = {
    onMouseEnter: () => setIsOpen(true),
    onMouseLeave: () => setIsOpen(false),
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, triggerProps);
  }

  return <div {...triggerProps}>{children}</div>;
}

export function TooltipContent({ children }: TooltipContentProps) {
  const { isOpen } = React.useContext(TooltipContext);

  if (!isOpen) return null;

  return (
    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded shadow-lg whitespace-nowrap z-50">
      {children}
      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
    </div>
  );
} 
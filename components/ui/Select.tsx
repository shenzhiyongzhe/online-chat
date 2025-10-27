import { SelectHTMLAttributes, forwardRef } from "react";
import { cn } from "../../lib/utils";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <select
        className={cn(
          "w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white",
          error ? "border-red-500 focus:ring-red-500" : "border-gray-300",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Select.displayName = "Select";

export { Select };

import React from "react";
import { Search } from "lucide-react";
import { Input } from "@ui/index";

interface SearchInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ value, onChange, placeholder, className = "w-[320px]" }, ref) => (
    <div className={`relative ${className}`}>
      <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-disabled pointer-events-none" />
      <Input
        ref={ref}
        placeholder={placeholder}
        className="pl-10 h-10"
        value={value}
        onChange={onChange}
      />
    </div>
  )
);
SearchInput.displayName = "SearchInput";

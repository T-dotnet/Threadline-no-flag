import { useState } from 'react';

export function useFormState<T extends Record<string, any>>(initial: T) {
  const [data, setData] = useState<T>(initial);
  const handleChange = (field: keyof T, value: any) =>
    setData(prev => ({ ...prev, [field]: value }));
  const reset = () => setData(initial);
  return { data, handleChange, reset, setData };
}

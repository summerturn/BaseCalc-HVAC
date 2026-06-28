import { View, Text, TextInput, TextInputProps } from 'react-native';
import { useState, useCallback, memo } from 'react';

interface ValidatedInputProps extends TextInputProps {
  label: string;
  validate: (value: string) => string | null;
  suffix?: string;
  min?: number;
  max?: number;
  required?: boolean;
}

export const ValidatedInput = memo(function ValidatedInput({
  label,
  validate,
  suffix,
  min,
  max,
  required,
  onChangeText,
  value,
  ...props
}: ValidatedInputProps) {
  const [touched, setTouched] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleChange = useCallback(
    (text: string) => {
      const error = validate(text);
      setLocalError(error);
      onChangeText?.(text);
    },
    [validate, onChangeText]
  );

  const handleBlur = useCallback(() => {
    setTouched(true);
    const error = validate(value || '');
    setLocalError(error);
  }, [validate, value]);

  const showError = touched && localError;

  return (
    <View className="mb-3">
      <Text className="text-gray-700 font-medium text-sm mb-1">
        {label}
        {required && <Text className="text-red-500"> *</Text>}
      </Text>
      <View
        className={`flex-row items-center bg-gray-50 rounded-lg border px-3 ${
          showError ? 'border-red-400 bg-red-50' : 'border-gray-200'
        }`}
      >
        <TextInput
          className={`flex-1 py-2.5 text-base ${showError ? 'text-red-900' : 'text-gray-900'}`}
          value={value}
          onChangeText={handleChange}
          onBlur={handleBlur}
          placeholderTextColor="#9ca3af"
          {...props}
        />
        {suffix && <Text className={`text-sm ml-1 ${showError ? 'text-red-500' : 'text-gray-500'}`}>{suffix}</Text>}
      </View>
      {showError && (
        <Text className="text-red-600 text-xs mt-1">{localError}</Text>
      )}
      {min !== undefined && max !== undefined && !showError && (
        <Text className="text-gray-400 text-xs mt-1">
          Valid range: {min} — {max}
        </Text>
      )}
    </View>
  );
});

// ─── HVAC-specific validators ─────────────────────────────────────────

export const HVACValidators = {
  cfm: (v: string) => {
    const n = parseFloat(v);
    if (isNaN(n) || n <= 0) return 'CFM must be a positive number';
    if (n > 100000) return 'CFM exceeds 100,000 — verify units';
    return null;
  },

  btu: (v: string) => {
    const n = parseFloat(v);
    if (isNaN(n) || n <= 0) return 'BTU/hr must be a positive number';
    if (n > 10000000) return 'BTU/hr exceeds 10,000,000 — verify units';
    return null;
  },

  tons: (v: string) => {
    const n = parseFloat(v);
    if (isNaN(n) || n <= 0) return 'Tonnage must be a positive number';
    if (n > 1000) return 'Tonnage exceeds 1,000 — verify units';
    return null;
  },

  deltaT: (v: string) => {
    const n = parseFloat(v);
    if (isNaN(n) || n <= 0) return 'ΔT must be a positive number';
    if (n > 120) return 'ΔT exceeds 120°F — verify units';
    return null;
  },

  temperature: (v: string) => {
    const n = parseFloat(v);
    if (isNaN(n)) return 'Temperature must be a valid number';
    if (n < -60) return 'Temperature below -60°F — verify reading';
    if (n > 180) return 'Temperature above 180°F — verify reading';
    return null;
  },

  wetBulb: (v: string) => {
    const n = parseFloat(v);
    if (isNaN(n)) return 'Wet-bulb must be a valid number';
    if (n < -10) return 'Wet-bulb below -10°F — verify reading';
    if (n > 100) return 'Wet-bulb above 100°F — verify reading';
    return null;
  },

  velocity: (v: string) => {
    const n = parseFloat(v);
    if (isNaN(n) || n <= 0) return 'Velocity must be a positive number';
    if (n > 5000) return 'Velocity exceeds 5,000 FPM — verify units';
    return null;
  },

  gpm: (v: string) => {
    const n = parseFloat(v);
    if (isNaN(n) || n <= 0) return 'GPM must be a positive number';
    if (n > 10000) return 'GPM exceeds 10,000 — verify units';
    return null;
  },

  percent: (v: string) => {
    const n = parseFloat(v);
    if (isNaN(n)) return 'Percentage must be a valid number';
    if (n < 0) return 'Percentage cannot be negative';
    if (n > 100) return 'Percentage cannot exceed 100%';
    return null;
  },

  taxRate: (v: string) => {
    const n = parseFloat(v);
    if (isNaN(n)) return 'Tax rate must be a number';
    if (n < 0) return 'Tax rate cannot be negative';
    if (n > 20) return 'Tax rate exceeds 20% — verify';
    return null;
  },

  positiveNumber: (name: string) => (v: string) => {
    const n = parseFloat(v);
    if (isNaN(n) || n <= 0) return `${name} must be a positive number`;
    return null;
  },
};

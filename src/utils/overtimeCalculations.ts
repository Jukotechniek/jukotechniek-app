
import { OvertimeCalculation } from '@/types/workHours';

export const calculateOvertimeHours = (date: string, hoursWorked: number) => {
  // Convert to Netherlands timezone
  const workDate = new Date(date + 'T00:00:00');
  const dayOfWeek = workDate.getDay(); // 0 = Sunday, 6 = Saturday
  const isSunday = dayOfWeek === 0;
  const isWeekend = dayOfWeek === 6; // Saturday only, Sunday handled separately
  
  let regularHours = 0;
  let overtimeHours = 0;
  let weekendHours = 0;
  let sundayHours = 0;

  if (isSunday) {
    // All Sunday hours are at Sunday rate (200%)
    sundayHours = hoursWorked;
  } else if (isWeekend) {
    // All Saturday hours are at weekend rate (150%)
    weekendHours = hoursWorked;
  } else {
    // Weekday: first 8 hours regular, rest overtime
    regularHours = Math.min(hoursWorked, 8);
    overtimeHours = Math.max(hoursWorked - 8, 0);
  }

  return {
    regularHours,
    overtimeHours,
    weekendHours,
    sundayHours,
    isWeekend,
    isSunday
  };
};

export const calculateOvertimePay = (
  regularHours: number,
  overtimeHours: number,
  weekendHours: number,
  sundayHours: number,
  hourlyRate: number
): OvertimeCalculation => {
  const regularPay = regularHours * hourlyRate;
  const overtimePay = overtimeHours * hourlyRate * 1.25; // 125%
  const weekendPay = weekendHours * hourlyRate * 1.5; // 150%
  const sundayPay = sundayHours * hourlyRate * 2.0; // 200%
  
  return {
    regularHours,
    overtimeHours,
    weekendHours,
    sundayHours,
    regularPay,
    overtimePay,
    weekendPay,
    sundayPay,
    totalPay: regularPay + overtimePay + weekendPay + sundayPay
  };
};

export const formatDutchDate = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('nl-NL');
};

export const formatDutchTime = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
};

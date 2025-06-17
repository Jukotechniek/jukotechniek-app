
import { OvertimeCalculation } from '@/types/workHours';

export const calculateOvertimeHours = (date: string, hoursWorked: number) => {
  const workDate = new Date(date);
  const isWeekend = workDate.getDay() === 6 || workDate.getDay() === 0; // Saturday or Sunday
  
  let regularHours = 0;
  let overtimeHours = 0;
  let weekendHours = 0;

  if (isWeekend) {
    // All weekend hours are at weekend rate
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
    isWeekend
  };
};

export const calculateOvertimePay = (
  regularHours: number,
  overtimeHours: number,
  weekendHours: number,
  hourlyRate: number
): OvertimeCalculation => {
  const regularPay = regularHours * hourlyRate;
  const overtimePay = overtimeHours * hourlyRate * 1.25; // 125%
  const weekendPay = weekendHours * hourlyRate * 1.5; // 150%
  
  return {
    regularHours,
    overtimeHours,
    weekendHours,
    regularPay,
    overtimePay,
    weekendPay,
    totalPay: regularPay + overtimePay + weekendPay
  };
};

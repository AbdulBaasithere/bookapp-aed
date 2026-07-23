import { Booking } from '../types';

/**
 * Checks if two time ranges overlap.
 * Ranges are defined by a start time (ISO/Date string or standard date object) and a duration in minutes.
 */
export function isOverlapping(
  start1Str: string,
  duration1: number,
  start2Str: string,
  duration2: number
): boolean {
  const start1 = new Date(start1Str).getTime();
  const end1 = start1 + duration1 * 60 * 1000;

  const start2 = new Date(start2Str).getTime();
  const end2 = start2 + duration2 * 60 * 1000;

  return start1 < end2 && end1 > start2;
}

export interface ConflictResult {
  hasConflict: boolean;
  message: string;
  conflictingBooking?: Booking;
}

/**
 * Detects if a new or updated booking conflicts with existing bookings.
 */
export function detectConflict(
  proposedBooking: {
    staffId: string;
    dateTime: string;
    durationMinutes: number;
    clientPhone: string;
  },
  existingBookings: Booking[],
  excludeBookingId?: string
): ConflictResult {
  if (!proposedBooking.dateTime || !proposedBooking.staffId || proposedBooking.durationMinutes <= 0) {
    return { hasConflict: false, message: "" };
  }

  // Only check active/confirmed/completed bookings for conflicts (cancelled or no-show bookings release the resource)
  const activeBookings = existingBookings.filter(
    (b) =>
      b.id !== excludeBookingId &&
      b.status !== 'cancelled' &&
      b.status !== 'no-show'
  );

  // Check Staff Conflict
  const staffConflict = activeBookings.find(
    (b) =>
      b.staffId === proposedBooking.staffId &&
      isOverlapping(b.dateTime, b.durationMinutes, proposedBooking.dateTime, proposedBooking.durationMinutes)
  );

  if (staffConflict) {
    const formattedTime = new Date(staffConflict.dateTime).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    return {
      hasConflict: true,
      message: `Staff member is already booked for "${staffConflict.serviceName}" with ${staffConflict.clientName} at ${formattedTime} (${staffConflict.durationMinutes} min).`,
      conflictingBooking: staffConflict,
    };
  }

  // Check Client Double-Booking (a client shouldn't be in two places at once)
  if (proposedBooking.clientPhone) {
    const clientConflict = activeBookings.find(
      (b) =>
        b.clientPhone === proposedBooking.clientPhone &&
        isOverlapping(b.dateTime, b.durationMinutes, proposedBooking.dateTime, proposedBooking.durationMinutes)
    );

    if (clientConflict) {
      const formattedTime = new Date(clientConflict.dateTime).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
      return {
        hasConflict: true,
        message: `Client ${clientConflict.clientName} already has another booking ("${clientConflict.serviceName}") at ${formattedTime}.`,
        conflictingBooking: clientConflict,
      };
    }
  }

  return { hasConflict: false, message: "" };
}

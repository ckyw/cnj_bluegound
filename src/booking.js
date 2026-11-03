export const DAY = 86_400_000;
export function isoDate(date = new Date()) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}
export function addDays(value, days) {
  const date = new Date(value + "T12:00:00");
  date.setDate(date.getDate() + days);
  return isoDate(date);
}
export function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;
  const date = new Date(value + "T12:00:00");
  return !Number.isNaN(date.getTime()) && isoDate(date) === value;
}
export function nightsBetween(start, end) {
  if (!validDate(start) || !validDate(end)) return 0;
  return Math.round(
    (Date.parse(end + "T00:00:00Z") - Date.parse(start + "T00:00:00Z")) / DAY,
  );
}
export function validateStay(stay, today = isoDate()) {
  if (!validDate(stay.checkin) || !validDate(stay.checkout))
    return "Choose valid check-in and check-out dates.";
  if (stay.checkin < today) return "Check-in must be today or a future date.";
  const nights = nightsBetween(stay.checkin, stay.checkout);
  if (nights < 1) return "Check-out must be after check-in.";
  if (nights > 30) return "For this demo, choose a stay of up to 30 nights.";
  if (!Number.isInteger(stay.guests) || stay.guests < 1 || stay.guests > 8)
    return "Choose between 1 and 8 guests.";
  if (
    !Number.isInteger(stay.rooms) ||
    stay.rooms < 1 ||
    stay.rooms > 4 ||
    stay.rooms > stay.guests
  )
    return "Choose 1–4 rooms, with at least one guest per room.";
  return "";
}
export function normalizeStay(params, branchIds, today = isoDate()) {
  const stay = {
    branch: branchIds.includes(params.get("branch"))
      ? params.get("branch")
      : "all",
    checkin: params.get("checkin") || addDays(today, 7),
    checkout: params.get("checkout") || addDays(today, 10),
    guests: Number(params.get("guests") || 2),
    rooms: Number(params.get("rooms") || 1),
    promo: (params.get("promo") || "").trim().toUpperCase().slice(0, 20),
  };
  if (validateStay(stay, today))
    Object.assign(stay, {
      checkin: addDays(today, 7),
      checkout: addDays(today, 10),
      guests: 2,
      rooms: 1,
    });
  return stay;
}
export function quote(rate, stay) {
  const nights = nightsBetween(stay.checkin, stay.checkout);
  if (
    !Number.isFinite(rate) ||
    rate <= 0 ||
    nights < 1 ||
    nights > 30 ||
    !Number.isInteger(stay.rooms) ||
    stay.rooms < 1 ||
    stay.rooms > 4
  )
    throw new RangeError("Invalid quote inputs");
  const subtotal = Math.round(rate * 100) * nights * stay.rooms;
  const code = (stay.promo || "").toUpperCase();
  const percent =
    code === "PIPE15" ? 15 : code === "STAY7" && nights >= 7 ? 20 : 0;
  const discount = Math.round((subtotal * percent) / 100);
  const cleaning = 1800 * stay.rooms;
  const tax = Math.round((subtotal - discount + cleaning) * 0.1);
  return {
    nights,
    subtotal,
    discount,
    percent,
    cleaning,
    tax,
    total: subtotal - discount + cleaning + tax,
    promoValid: !code || percent > 0,
  };
}
export function searchParams(stay) {
  return new URLSearchParams(
    Object.entries(stay).map(([key, value]) => [key, String(value)]),
  ).toString();
}

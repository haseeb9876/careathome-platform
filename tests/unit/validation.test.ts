import { describe, it, expect } from "vitest";
import {
  registrationSchema,
  loginSchema,
} from "../../src/modules/accounts/validation";
import {
  bookingSchema,
  canTransition,
  states,
} from "../../src/modules/bookings/validation";
const patient = {
  name: "Demo Patient",
  email: "patient@example.test",
  password: "SyntheticPass123!",
  role: "patient",
};
describe("registration trust boundary", () => {
  it("permits patient signup", () =>
    expect(registrationSchema.safeParse(patient).success).toBe(true));
  it("rejects administrator selection", () =>
    expect(
      registrationSchema.safeParse({ ...patient, role: "admin" }).success,
    ).toBe(false));
  it("requires a provider profession", () =>
    expect(
      registrationSchema.safeParse({ ...patient, role: "provider" }).success,
    ).toBe(false));
  it("permits only supported professions", () =>
    expect(
      registrationSchema.safeParse({
        ...patient,
        role: "provider",
        profession: "doctor",
      }).success,
    ).toBe(false));
  it("accepts a pending provider's valid fields", () =>
    expect(
      registrationSchema.safeParse({
        ...patient,
        role: "provider",
        profession: "nurse",
      }).success,
    ).toBe(true));
  it("rejects short passwords and malformed email", () => {
    expect(
      registrationSchema.safeParse({ ...patient, password: "short" }).success,
    ).toBe(false);
    expect(
      loginSchema.safeParse({ email: "invalid", password: "x" }).success,
    ).toBe(false);
  });
});
describe("booking validation", () => {
  it("rejects malformed UUID and missing location", () =>
    expect(
      bookingSchema.safeParse({
        service: "x",
        start: "tomorrow",
        address: "",
        area: "",
        requestKey: "x",
      }).success,
    ).toBe(false));
  it("removes client ownership and price fields", () => {
    const v = bookingSchema.parse({
      service: "10000000-0000-4000-8000-000000000001",
      start: "2027-01-01T10:00",
      address: "Synthetic address",
      area: "Peshawar",
      requestKey: "10000000-0000-4000-8000-000000000002",
      patient_id: "attacker",
      price_minor: 1,
    });
    expect(v).not.toHaveProperty("patient_id");
    expect(v).not.toHaveProperty("price_minor");
  });
  it("makes completed and cancelled terminal", () => {
    for (const status of states) {
      expect(canTransition("Completed", status)).toBe(false);
      expect(canTransition("Cancelled", status)).toBe(false);
    }
  });
  it("requires an assignment queue before confirmation", () => {
    expect(canTransition("Requested", "Confirmed")).toBe(false);
    expect(canTransition("Requested", "Pending Assignment")).toBe(true);
    expect(canTransition("Reassignment Required", "Confirmed")).toBe(true);
  });
});

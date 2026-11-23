import { describe, it, expect, afterEach } from "vitest";
import {
  getWhatsAppNumber,
  getDisplayPhoneNumber,
  getWhatsAppUrl,
  DEFAULT_PHONE_NUMBER,
} from "@/lib/config/contact";

describe("Contact & WhatsApp Config Helper", () => {
  const originalEnv = process.env.NEXT_PUBLIC_PHONE_NUMBER;

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.NEXT_PUBLIC_PHONE_NUMBER = originalEnv;
    } else {
      delete process.env.NEXT_PUBLIC_PHONE_NUMBER;
    }
  });

  describe("getWhatsAppNumber", () => {
    it("returns default when env variable is not set", () => {
      delete process.env.NEXT_PUBLIC_PHONE_NUMBER;
      expect(getWhatsAppNumber()).toBe(DEFAULT_PHONE_NUMBER);
    });

    it("parses 11-digit local format by prepending BD country code 88", () => {
      process.env.NEXT_PUBLIC_PHONE_NUMBER = "01712345678";
      expect(getWhatsAppNumber()).toBe("8801712345678");
    });

    it("strips plus signs, dashes, and spaces from international format", () => {
      process.env.NEXT_PUBLIC_PHONE_NUMBER = "+880 1812-345678";
      expect(getWhatsAppNumber()).toBe("8801812345678");
    });
  });

  describe("getDisplayPhoneNumber", () => {
    it("formats international number with + prefix", () => {
      process.env.NEXT_PUBLIC_PHONE_NUMBER = "8801311333277";
      expect(getDisplayPhoneNumber("international")).toBe("+8801311333277");
    });

    it("formats local number with hyphen for 11-digit BD mobile", () => {
      process.env.NEXT_PUBLIC_PHONE_NUMBER = "8801311333277";
      expect(getDisplayPhoneNumber("local")).toBe("01311-333277");
    });

    it("formats custom local number with hyphen correctly", () => {
      process.env.NEXT_PUBLIC_PHONE_NUMBER = "01712345678";
      expect(getDisplayPhoneNumber("local")).toBe("01712-345678");
    });
  });

  describe("getWhatsAppUrl", () => {
    it("generates wa.me link without message", () => {
      process.env.NEXT_PUBLIC_PHONE_NUMBER = "01712345678";
      expect(getWhatsAppUrl()).toBe("https://wa.me/8801712345678");
    });

    it("generates wa.me link with encoded custom message", () => {
      process.env.NEXT_PUBLIC_PHONE_NUMBER = "01712345678";
      expect(getWhatsAppUrl("Hello VibeLock")).toBe(
        "https://wa.me/8801712345678?text=Hello%20VibeLock"
      );
    });
  });
});

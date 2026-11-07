"use client";

import { useState } from "react";
import { Send, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function ContactForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "Order Status & Tracking",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setIsSubmitting(true);

    // Simulate reliable transmission with feedback
    await new Promise((resolve) => setTimeout(resolve, 800));

    setIsSubmitting(false);
    setIsSent(true);
    toast.success("Transmission received! Our team will respond shortly.");
  };

  if (isSent) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-black/10 bg-white p-8 text-center shadow-sm sm:p-12">
        <div className="flex size-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <CheckCircle2 className="size-8" />
        </div>
        <h3 className="mt-4 text-xl font-black tracking-tight text-[#101114] uppercase">
          Message Dispatched
        </h3>
        <p className="mt-2 max-w-sm text-xs leading-relaxed text-[#101114]/70">
          Thanks for reaching out, <span className="font-bold text-[#101114]">{formData.name}</span>
          . Our support crew at VibeLock HQ will review your inquiry and reply via email within 2-4
          business hours.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setIsSent(false);
            setFormData({
              name: "",
              email: "",
              phone: "",
              subject: "Order Status & Tracking",
              message: "",
            });
          }}
          className="mt-6"
        >
          Send Another Message
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-2xl border border-black/10 bg-white p-6 shadow-sm sm:p-8"
    >
      <div>
        <span className="text-2xs tracking-streetwear font-extrabold text-[#0088A8] uppercase">
          TRANSMISSION FORM
        </span>
        <h3 className="mt-1 text-lg font-black tracking-tight text-[#101114] uppercase">
          Send Us A Message
        </h3>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Name */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="contact-name"
            className="text-xs font-bold tracking-wider text-[#101114] uppercase"
          >
            Your Name <span className="text-red-500">*</span>
          </label>
          <Input
            id="contact-name"
            variant="brand"
            size="md"
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Tanvir Ahmed"
          />
        </div>

        {/* Email */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="contact-email"
            className="text-xs font-bold tracking-wider text-[#101114] uppercase"
          >
            Email Address <span className="text-red-500">*</span>
          </label>
          <Input
            id="contact-email"
            variant="brand"
            size="md"
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="tanvir@example.com"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Phone */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="contact-phone"
            className="text-xs font-bold tracking-wider text-[#101114] uppercase"
          >
            Phone Number{" "}
            <span className="text-xs font-normal text-[#101114]/40 lowercase">(optional)</span>
          </label>
          <Input
            id="contact-phone"
            variant="brand"
            size="md"
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="01700-000000"
          />
        </div>

        {/* Subject / Category */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="contact-subject"
            className="text-xs font-bold tracking-wider text-[#101114] uppercase"
          >
            Inquiry Type
          </label>
          <select
            id="contact-subject"
            value={formData.subject}
            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            className="border-vl-black/15 focus:ring-vl-cyan h-10 rounded-xs border bg-white px-3 text-xs text-[#101114] transition-colors focus:border-vl-black focus:ring-2 focus:outline-none"
          >
            <option value="Order Status & Tracking">Order Status & Tracking</option>
            <option value="Size & Fit Consultation">Size & Fit Consultation</option>
            <option value="Return & Exchange Request">Return & Exchange Request</option>
            <option value="Flagship Storefront Inquiry">Flagship Storefront Inquiry</option>
            <option value="Collaboration & Press">Collaboration & Press</option>
          </select>
        </div>
      </div>

      {/* Message */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="contact-message"
          className="text-xs font-bold tracking-wider text-[#101114] uppercase"
        >
          Message <span className="text-red-500">*</span>
        </label>
        <Textarea
          id="contact-message"
          variant="brand"
          required
          rows={4}
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          placeholder="How can our crew help you today? Please include order number if applicable."
        />
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        size="lg"
        disabled={isSubmitting}
        loading={isSubmitting}
        className="mt-2"
      >
        <span>{isSubmitting ? "TRANSMITTING..." : "DISPATCH TRANSMISSION"}</span>
        {!isSubmitting && <Send className="size-3.5 text-[#00D9FF]" />}
      </Button>
    </form>
  );
}

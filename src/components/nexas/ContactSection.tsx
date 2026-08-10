import { useState } from "react";
import { toast } from "sonner";
import { Mail, MapPin, Phone, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ContactSection() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toast.error("Please fill in all fields.");
      return;
    }
    toast.success("Thanks for reaching out! We'll get back to you soon.");
    setForm({ name: "", email: "", message: "" });
  };

  return (
    <section id="contact" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-20 sm:px-6">
      <div className="mb-12 text-center">
        <h2 className="font-display text-3xl font-bold sm:text-4xl">
          Get in <span className="text-gold-gradient">Touch</span>
        </h2>
        <p className="mt-3 text-muted-foreground">
          Questions about an order or product? We&apos;re here to help.
        </p>
      </div>

      <div className="grid gap-10 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="space-y-4">
            <ContactRow icon={Phone} label="Phone" value="0321 9965754" href="tel:03219965754" />
            <ContactRow
              icon={Mail}
              label="Email"
              value="asifabdulbasit7@gmail.com"
              href="mailto:asifabdulbasit7@gmail.com"
            />
            <ContactRow icon={MapPin} label="Location" value="Pakistan" />
          </div>

          <div className="overflow-hidden rounded-xl border border-border/60">
            <iframe
              title="NexasStore location"
              src="https://www.google.com/maps?q=Pakistan&output=embed"
              className="h-64 w-full grayscale-[0.3]"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>

        <form
          onSubmit={submit}
          className="space-y-4 rounded-xl border border-border/60 bg-card p-6 shadow-elegant"
        >
          <div className="space-y-1.5">
            <Label htmlFor="c-name">Name</Label>
            <Input
              id="c-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Your name"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-email">Email</Label>
            <Input
              id="c-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-msg">Message</Label>
            <Textarea
              id="c-msg"
              rows={5}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="How can we help?"
            />
          </div>
          <Button type="submit" variant="gold" className="w-full">
            <Send className="size-4" />
            Send Message
          </Button>
        </form>
      </div>
    </section>
  );
}

function ContactRow({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  href?: string;
}) {
  const content = (
    <div className="flex items-center gap-4 rounded-xl border border-border/60 bg-card p-4 transition-colors hover:border-primary/50">
      <span className="flex size-11 items-center justify-center rounded-full bg-gold-gradient shadow-gold">
        <Icon className="size-5 text-primary-foreground" />
      </span>
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  );
  return href ? <a href={href}>{content}</a> : content;
}

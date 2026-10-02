import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, Clock, ShieldCheck, Stethoscope, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LangToggle } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { useAuth, homeFor } from "@/lib/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Shifa Queue — Digital Hospital Tokens & Live Queue" },
      { name: "description", content: "Book a doctor, receive a digital token and follow the live hospital queue in English or Urdu." },
      { property: "og:title", content: "Shifa Queue — Digital Hospital Tokens & Live Queue" },
      { property: "og:description", content: "Book a doctor, receive a digital token and follow the live hospital queue in English or Urdu." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { t, lang } = useI18n();
  const { user, roles } = useAuth();
  const features = lang === "ur"
    ? [[Ticket, "ڈیجیٹل ٹوکن", "بکنگ پر فوری ٹوکن نمبر"], [Clock, "براہ راست قطار", "اپنی باری اور متوقع وقت دیکھیں"], [Stethoscope, "ڈاکٹر ڈیش بورڈ", "اگلے مریض کو بلائیں، ریکارڈ فوراً کھلے"], [ShieldCheck, "محفوظ ریکارڈ", "سخت رسائی اور ناقابلِ تبدیل آڈٹ"]]
    : [[Ticket, "Digital tokens", "Instant token number when you book"], [Clock, "Live queue", "See the current token and your wait"], [Stethoscope, "Doctor dashboard", "Call next — records open instantly"], [ShieldCheck, "Private records", "Need-to-know access & immutable audit"]];
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center px-4 py-5">
        <span className="flex items-center gap-2 font-display text-xl font-bold text-primary"><Activity className="h-6 w-6" />{t("appName")}</span>
        <div className="ms-auto flex items-center gap-2">
          <LangToggle />
          {user ? <Button asChild><Link to={homeFor(roles)}>{t("myQueue")}</Link></Button>
            : <Button asChild variant="outline"><Link to="/auth">{t("signIn")}</Link></Button>}
        </div>
      </header>
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 md:grid-cols-2 md:py-20">
        <div>
          <h1 className="text-4xl font-bold leading-tight text-foreground md:text-6xl">{t("tagline")}</h1>
          <p className="mt-5 max-w-lg text-lg text-muted-foreground">{t("heroSub")}</p>
          <div className="mt-8 flex gap-3">
            <Button size="lg" asChild><Link to={user ? homeFor(roles) : "/auth"}>{t("getStarted")}</Link></Button>
          </div>
        </div>
        <div className="relative mx-auto w-full max-w-sm rounded-3xl border bg-card p-8 shadow-xl">
          <p className="text-sm text-muted-foreground">{t("nowServing")}</p>
          <p className="token-num text-6xl font-bold text-primary">#17</p>
          <div className="my-6 h-2 rounded-full bg-muted"><div className="h-2 w-3/4 rounded-full bg-primary" /></div>
          <div className="flex items-end justify-between">
            <div><p className="text-sm text-muted-foreground">{t("yourToken")}</p><p className="token-num text-5xl font-bold text-accent">#20</p></div>
            <div className="text-end"><p className="text-sm text-muted-foreground">{t("estWait")}</p><p className="text-2xl font-semibold">~30 {t("minutes")}</p></div>
          </div>
        </div>
      </section>
      <section className="mx-auto grid max-w-6xl gap-4 px-4 pb-20 sm:grid-cols-2 lg:grid-cols-4">
        {features.map(([Icon, title, body]) => {
          const I = Icon as typeof Ticket;
          return (
            <div key={title as string} className="rounded-2xl border bg-card p-5">
              <I className="h-6 w-6 text-primary" />
              <h3 className="mt-3 text-lg font-semibold">{title as string}</h3>
              <p className="text-sm text-muted-foreground">{body as string}</p>
            </div>
          );
        })}
      </section>
    </div>
  );
}

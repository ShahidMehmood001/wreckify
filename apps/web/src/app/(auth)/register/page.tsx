import Link from "next/link";
import { Car, Wrench, ArrowRight } from "lucide-react";

const paths = [
  {
    href: "/register/owner",
    icon: Car,
    title: "Car Owner",
    description: "Manage your vehicles, track repair history, and get instant damage assessments.",
    cta: "Get started",
  },
  {
    href: "/register/workshop",
    icon: Wrench,
    title: "Workshop Owner",
    description: "Register your workshop, receive customer inquiries, and grow your business.",
    cta: "Register workshop",
  },
];

export default function RegisterPage() {
  return (
    <div className="w-full max-w-2xl space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Join Wreckify</h1>
        <p className="text-muted-foreground">Choose how you'd like to get started</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {paths.map(({ href, icon: Icon, title, description, cta }) => (
          <Link
            key={href}
            href={href}
            className="group flex flex-col gap-4 rounded-xl border bg-card p-6 shadow-sm transition-all hover:shadow-md hover:border-primary/50 hover:bg-accent/30"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary/15 transition-colors">
                <Icon className="w-6 h-6" />
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">{title}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
            </div>
            <span className="mt-auto text-sm font-medium text-primary flex items-center gap-1">
              {cta} <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </Link>
        ))}
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="text-primary font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

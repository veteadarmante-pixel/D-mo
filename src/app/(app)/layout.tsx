import Link from "next/link";
import { LogOut } from "lucide-react";
import { BottomNav, TopNav } from "@/components/nav";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/supabase/server";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  await requireUser();
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4">
          <Link href="/" className="font-semibold tracking-tight">
            Conseiller Financier
          </Link>
          <TopNav />
          <form action="/auth/logout" method="post">
            <Button variant="ghost" size="icon" aria-label="Se déconnecter">
              <LogOut />
            </Button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 pb-24 md:pb-10">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}

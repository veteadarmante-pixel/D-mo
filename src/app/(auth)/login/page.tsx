import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginForm } from "./login-form";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { erreur } = await searchParams;
  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Conseiller Financier</CardTitle>
          <CardDescription>
            Connexion sans mot de passe : vous recevez un lien par email.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {erreur && (
            <p className="text-sm text-muted-foreground">
              Le lien est invalide ou a expiré. Demandez-en un nouveau.
            </p>
          )}
          <LoginForm />
        </CardContent>
      </Card>
    </main>
  );
}

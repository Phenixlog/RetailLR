import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold">
          La Redoute x Phenix Log
        </h1>
        <p className="text-xl text-muted-foreground">
          Plateforme de gestion des commandes d'échantillons
        </p>
        <div className="flex gap-4 justify-center mt-8">
          <Link
            href="/login"
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Se connecter
          </Link>
        </div>
      </div>
    </main>
  );
}

import { Suspense } from "react";
import { connection } from "next/server";
import os from "node:os";
import { existsSync } from "node:fs";

// Datos que solo existen en tiempo de ejecución: permiten comprobar
// que la página la está sirviendo el contenedor y no la máquina local.
async function RuntimeInfo() {
  await connection();

  const enDocker = existsSync("/.dockerenv");
  const filas = [
    ["Hostname", os.hostname()],
    ["Node.js", process.version],
    ["Sistema", `${os.type()} ${os.release()} (${os.arch()})`],
    ["Entorno", process.env.NODE_ENV ?? "desconocido"],
    ["Puerto", process.env.PORT ?? "3000"],
    ["Hora del servidor", new Date().toLocaleString("es-SV", { timeZone: "America/El_Salvador" })],
  ];

  return (
    <>
      <p
        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${
          enDocker
            ? "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200"
            : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
        }`}
      >
        <span className={`h-2 w-2 rounded-full ${enDocker ? "bg-sky-500" : "bg-amber-500"}`} />
        {enDocker ? "Ejecutándose dentro de un contenedor Docker" : "Ejecutándose fuera de Docker"}
      </p>

      <dl className="mt-6 divide-y divide-zinc-200 rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
        {filas.map(([etiqueta, valor]) => (
          <div key={etiqueta} className="grid grid-cols-[9rem_1fr] gap-4 px-4 py-3 text-sm">
            <dt className="text-zinc-500 dark:text-zinc-400">{etiqueta}</dt>
            <dd className="break-all font-mono text-zinc-900 dark:text-zinc-100">{valor}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-6 py-16">
      <p className="text-sm font-semibold uppercase tracking-widest text-sky-600 dark:text-sky-400">
        Next.js + Docker
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
        Aplicación web contenerizada
      </h1>
      <p className="mt-4 text-zinc-600 dark:text-zinc-400">
        Imagen construida con un Dockerfile multi-stage sobre Node.js Alpine. La misma imagen se
        ejecuta igual en cualquier máquina con Docker: desarrollo, pruebas o producción.
      </p>

      <section className="mt-10">
        <Suspense fallback={<p className="text-sm text-zinc-500">Leyendo datos del servidor…</p>}>
          <RuntimeInfo />
        </Suspense>
      </section>

      <p className="mt-8 text-sm text-zinc-500 dark:text-zinc-400">
        Estado del servicio:{" "}
        <a href="/api/health" className="font-mono text-sky-600 underline dark:text-sky-400">
          /api/health
        </a>
      </p>
    </main>
  );
}

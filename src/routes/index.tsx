import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { KeelConsole } from "@/components/keel/console";
import { useKeel } from "@/lib/keel/store";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  useEffect(() => {
    void useKeel.persist.rehydrate();
  }, []);
  return <KeelConsole />;
}

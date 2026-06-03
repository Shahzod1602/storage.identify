"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getKeys, type ProjectKeys } from "@/lib/api";

interface ProjectCtx {
  ref: string;
  keys: ProjectKeys | null;
  error: string | null;
}

const Ctx = createContext<ProjectCtx>({ ref: "", keys: null, error: null });

export function useProject(): ProjectCtx {
  return useContext(Ctx);
}

export function ProjectProvider({
  refId,
  children,
}: {
  refId: string;
  children: React.ReactNode;
}) {
  const [keys, setKeys] = useState<ProjectKeys | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getKeys(refId).then(setKeys).catch((e) => setError(e.message));
  }, [refId]);

  return (
    <Ctx.Provider value={{ ref: refId, keys, error }}>{children}</Ctx.Provider>
  );
}

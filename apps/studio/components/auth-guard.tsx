"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthed } from "@/lib/api";

/** Login bo'lmasa /login'ga yo'naltiradi. true = kirish ruxsat etilgan. */
export function useRequireAuth(): boolean {
  const router = useRouter();
  const [ok, setOk] = useState(false);
  useEffect(() => {
    if (isAuthed()) setOk(true);
    else router.replace("/login");
  }, [router]);
  return ok;
}

"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const clientNickname = localStorage.getItem("clientNickname");
    if (clientNickname) {
      router.push("/agent/1");
    } else {
      router.push("/agent");
    }
  }, []);
}

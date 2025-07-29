"use client";

import React, { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

function page() {
  const supabase = createClientComponentClient();

  const [user, setUser] = useState<{ name: string; role: string } | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("name, role")
        .eq("uid", user.id)
        .single();

      if (profile) {
        setUser(profile);
      }
    };

    fetchUser();
  }, [supabase]);

  if (!user) return <p className="text-center mt-10">Loading...</p>;

  return <div>{user.role} Login</div>;
}

export default page;

import React from 'react'

function page() {
  return (
    <div>officer</div>
  )
}

export default page

// import React, { useEffect, useState } from "react";
// import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

// function page() {
//   const supabase = createClientComponentClient();

//   const [user, setUser] = useState<{ name: string; role: string } | null>(null);

//   useEffect(() => {
//     const fetchUser = async () => {
//       const {
//         data: { user },
//       } = await supabase.auth.getUser();
//       if (!user) return;

//       const { data: profile } = await supabase
//         .from("profiles")
//         .select("name, role")
//         .eq("uid", user.id)
//         .single();

//       if (!profile) {
//         const { data: student } = await supabase
//           .from("students")
//           .select("name, role")
//           .eq("uid", user.id)
//           .single();
//         if (student) setUser(student);
//       } else {
//         setUser(profile);
//       }
//     };

//     fetchUser();
//   }, [supabase]);
//   return <div>officer</div>;
// }

// export default page;
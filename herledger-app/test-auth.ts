import { auth } from "./apps/web/lib/auth/server";
console.log(Object.keys(auth.api).filter((k) => k.toLowerCase().includes("password")));

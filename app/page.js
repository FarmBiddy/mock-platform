import { redirect } from "next/navigation";
import { getViewer } from "@/lib/session";

export default async function Home() {
  redirect((await getViewer()).role === "advisor" ? "/portfolio" : "/dashboard");
}

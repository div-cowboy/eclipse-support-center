import { auth } from "../auth";
import { redirect } from "next/navigation";

const ProtectedPage = async () => {
  const session = await auth();

  console.log("session", session);

  if (!session?.user) {
    redirect("/");
  }

  return <div>ProtectedPage {session?.user?.email}</div>;
};

export default ProtectedPage;

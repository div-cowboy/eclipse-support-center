import { auth } from "../auth";
import { redirect } from "next/navigation";

const ProtectedPage = async () => {
  const session = await auth();

  if (!session) {
    redirect("/");
  }

  return <div>ProtectedPage - Welcome {session.user?.email}</div>;
};

export default ProtectedPage;

import { auth } from "../auth";

const ProtectedPage = async () => {
  const session = await auth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {session?.user?.name || session?.user?.email}!
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-card p-6">
          <h3 className="text-lg font-semibold">Total Projects</h3>
          <p className="text-3xl font-bold">12</p>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <h3 className="text-lg font-semibold">Active Tasks</h3>
          <p className="text-3xl font-bold">24</p>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <h3 className="text-lg font-semibold">Team Members</h3>
          <p className="text-3xl font-bold">8</p>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <h3 className="text-lg font-semibold">Completed</h3>
          <p className="text-3xl font-bold">156</p>
        </div>
      </div>
    </div>
  );
};

export default ProtectedPage;

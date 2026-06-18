import PageHeader from "@/app/components/PageHeader";
import RolesFeed from "@/app/components/roles/RolesFeed";

export default function RolesPage() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader
        title="Live Roles"
        subtitle="Open roles from UK sponsors' careers boards — search, filter, save to your board."
      />

      <div className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto max-w-4xl p-8">
          <RolesFeed />
        </div>
      </div>
    </div>
  );
}
